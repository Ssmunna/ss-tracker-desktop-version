/* eslint-disable react-hooks/immutability -- the three.js scene graph is mutated imperatively, every frame, by design */
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useStore } from 'react-redux';
import * as THREE from 'three';

import { useAppDispatch } from '@/app/hooks';
import type { RootState } from '@/app/store';

import { buildCharacter, buildHouse } from './buildMascot';
import { clearQueue, finish, takeNext, type MascotItem } from './mascotSlice';
import { voice } from './voice';

const SCALE = 54; // 1 model unit = 54 CSS px (about 150 px tall)
const HOUSE_SCALE = 32; // house size when popped out
const DUR = {
    houseIn: 0.35,
    doorOpen: 0.35,
    walkOut: 1.25,
    turn: 0.3,
    wave: 1.3,
    turnBack: 0.25,
    walkIn: 1.15,
    doorClose: 0.3,
    houseOut: 0.3,
};

type Phase =
    | 'houseIn'
    | 'doorOpen'
    | 'walkOut'
    | 'turn'
    | 'wave'
    | 'talk'
    | 'turnBack'
    | 'walkIn'
    | 'doorClose'
    | 'houseOut'
    | 'done';

const ease = {
    inOut: (t: number) =>
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    out: (t: number) => 1 - Math.pow(1 - t, 3),
    back: (t: number) => {
        const c1 = 1.70158;
        const c3 = c1 + 1;

        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const damp = (a: number, b: number, rate: number, dt: number) =>
    lerp(a, b, 1 - Math.exp(-rate * dt));

const REST_POSE = {
    legL: 0,
    legR: 0,
    armLx: 0,
    armRx: 0,
    armRz: 0,
    armLz: 0,
    headZ: 0,
    headX: 0,
    bob: 0,
    mouth: 0.45,
};
type Pose = typeof REST_POSE;

interface Run {
    phase: Phase;
    t: number;
    item: MascotItem | null;
    line: string;
    typed: number;
    spoken: boolean;
    walk: number;
    facing: number;
    back: number;
    door: THREE.Vector3;
    spot: THREE.Vector3;
    pose: Pose;
}

/** Fills the bubble with plain text nodes, so a name or title can never inject markup. */
function fillBubble(
    el: HTMLElement,
    parts: { className: string; text: string }[],
) {
    el.replaceChildren(
        ...parts.map(({ className, text }) => {
            const div = document.createElement('div');

            div.className = className;
            div.textContent = text;

            return div;
        }),
    );
    el.classList.add('show');
}

interface MascotSceneProps {
    anchorRef: RefObject<HTMLElement | null>;
    bubbleRef: RefObject<HTMLDivElement | null>;
    shirtFront: string;
    onOpenItem: (item: MascotItem) => void;
}

/**
 * Runs inside an orthographic <Canvas>: 1 world unit = 1 CSS px, origin = screen centre.
 * The whole sequence is driven from useFrame, so nothing re-renders per frame.
 * houseIn -> doorOpen -> walkOut -> turn -> wave -> talk (x queue) -> turnBack -> walkIn -> doorClose -> houseOut
 * The speech bubble is plain HTML so the text stays crisp.
 */
export default function MascotScene({
    anchorRef,
    bubbleRef,
    shirtFront,
    onOpenItem,
}: MascotSceneProps) {
    const dispatch = useAppDispatch();
    const store = useStore<RootState>();
    const size = useThree((state) => state.size);
    const rig = useMemo(() => buildCharacter({ shirtFront }), [shirtFront]);
    const home = useMemo(() => buildHouse(), []);
    const run = useRef<Run>({
        phase: 'houseIn',
        t: 0,
        item: null,
        line: '',
        typed: -1,
        spoken: false,
        walk: 0,
        facing: 0,
        back: 0,
        door: new THREE.Vector3(),
        spot: new THREE.Vector3(),
        pose: { ...REST_POSE },
    });
    // Always the latest, without re-binding the bubble's click handler.
    const openItem = useRef(onOpenItem);

    useEffect(() => {
        openItem.current = onOpenItem;
    }, [onOpenItem]);

    // Free the GPU memory when the overlay unmounts.
    useEffect(
        () => () => {
            for (const root of [rig.char, home.house]) {
                root.traverse((node) => {
                    if (node instanceof THREE.Mesh) {
                        node.geometry.dispose();
                    }
                });
            }

            for (const material of rig.materials) {
                material.dispose();
            }
        },
        [rig, home],
    );

    // Put the house on the header icon and work out the door and the landing spot.
    useEffect(() => {
        const rect = anchorRef.current?.getBoundingClientRect();

        home.house.scale.setScalar(0.001);
        rig.char.visible = false;
        rig.char.scale.setScalar(SCALE);
        rig.char.position.z = 300;

        if (!rect) {
            return;
        }

        const toWorld = (x: number, y: number) =>
            new THREE.Vector3(x - size.width / 2, size.height / 2 - y, 0);
        const centre = toWorld(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2 + 4,
        );
        const s = run.current;
        const before = home.house.scale.x;

        home.house.position.set(centre.x, centre.y, 0);
        home.house.scale.setScalar(HOUSE_SCALE);
        home.house.updateMatrixWorld(true);
        home.doorMark.getWorldPosition(s.door);
        home.house.scale.setScalar(before);
        home.house.updateMatrixWorld(true);
        s.spot.copy(
            toWorld(
                Math.max(110, rect.left - 150),
                Math.min(size.height - 40, rect.bottom + 265),
            ),
        );
    }, [anchorRef, home, rig, size.width, size.height]);

    // Clicking the bubble opens the item, skips the rest of the queue and sends the mascot home.
    useEffect(() => {
        const el = bubbleRef.current;

        if (!el) {
            return;
        }

        const onClick = () => {
            const s = run.current;

            if (!s.item) {
                return;
            }

            openItem.current(s.item);
            dispatch(clearQueue());
            voice.stop();

            if (s.phase === 'talk' || s.phase === 'wave') {
                el.classList.remove('show');
                s.back = Math.atan2(
                    s.door.x - s.spot.x,
                    -(s.door.y - s.spot.y),
                );
                s.phase = 'turnBack';
                s.t = 0;
            }
        };

        el.addEventListener('click', onClick);

        return () => el.removeEventListener('click', onClick);
    }, [bubbleRef, dispatch]);

    useFrame((state, rawDt) => {
        const dt = Math.min(0.05, rawDt);
        const s = run.current;
        const bubble = bubbleRef.current;
        const {
            char,
            armL,
            armR,
            legL,
            legR,
            headPivot,
            body,
            mouth,
            eyeL,
            eyeR,
            torso,
        } = rig;

        s.t += dt;

        const progress = (duration: number) => Math.min(1, s.t / duration);
        const go = (phase: Phase) => {
            s.phase = phase;
            s.t = 0;
        };
        const pullNext = () => {
            dispatch(takeNext());

            return store.getState().mascot.current;
        };
        const queued = () => store.getState().mascot.queue.length;
        const setOpacity = (opacity: number) => {
            for (const material of rig.materials) {
                material.opacity = material.userData.baseOpacity * opacity;
            }
        };
        const renderTalk = (item: MascotItem, count: number) => {
            if (!bubble) {
                return;
            }

            const parts = [
                {
                    className: 'said',
                    text: `${item.type === 'message' ? '💬' : '🔔'} ${s.line.slice(0, count)}${count < s.line.length ? ' ▍' : ''}`,
                },
            ];

            if (item.type === 'notification' && item.detail) {
                parts.push({ className: 'orig', text: item.detail });
            }

            parts.push({ className: 'open', text: 'Click to open' });
            fillBubble(bubble, parts);
        };
        const startTalk = () => {
            const item = s.item;

            if (!item) {
                return;
            }

            const line = voice.line(item);

            s.line = line.text;
            s.typed = -1;
            s.spoken = false;
            go('talk');
            renderTalk(item, 0);
            void voice.play(line.file).then(() => {
                if (s.item === item) {
                    s.spoken = true;
                }
            });
        };
        const headHome = () => {
            bubble?.classList.remove('show');
            s.back = Math.atan2(s.door.x - s.spot.x, -(s.door.y - s.spot.y));
            go('turnBack');
        };

        const target: Pose = { ...REST_POSE };
        const walkCycle = () => {
            s.walk += dt * 11;

            const w = Math.sin(s.walk);

            target.legL = w * 0.6;
            target.legR = -w * 0.6;
            target.armLx = -w * 0.55;
            target.armRx = w * 0.55;
            target.bob = Math.abs(Math.cos(s.walk)) * 0.06;
        };

        switch (s.phase) {
            case 'houseIn':
                home.house.scale.setScalar(
                    lerp(22, HOUSE_SCALE, ease.back(progress(DUR.houseIn))),
                );

                if (s.t >= DUR.houseIn) {
                    s.item = pullNext();
                    go('doorOpen');
                }

                break;
            case 'doorOpen':
                home.doorPivot.rotation.y = lerp(
                    0,
                    -1.9,
                    ease.out(progress(DUR.doorOpen)),
                );

                if (s.t >= DUR.doorOpen) {
                    char.visible = true;
                    char.position.set(s.door.x, s.door.y, 300);
                    char.rotation.y = 0;
                    go('walkOut');
                }

                break;
            case 'walkOut': {
                const k = progress(DUR.walkOut);
                const e = ease.inOut(k);

                char.position.x = lerp(s.door.x, s.spot.x, e);
                char.position.y = lerp(s.door.y, s.spot.y, e);
                char.scale.setScalar(
                    SCALE * lerp(0.35, 1, ease.out(Math.min(1, k * 1.6))),
                );
                setOpacity(Math.min(1, k * 6));
                s.facing = Math.atan2(
                    s.spot.x - s.door.x,
                    -(s.spot.y - s.door.y),
                );
                char.rotation.y = damp(char.rotation.y, s.facing, 12, dt);
                walkCycle();

                if (k >= 1) {
                    go('turn');
                }

                break;
            }
            case 'turn':
                char.rotation.y = lerp(
                    s.facing,
                    0,
                    ease.inOut(progress(DUR.turn)),
                );

                if (s.t >= DUR.turn) {
                    const greeting = voice.greeting();

                    go('wave');

                    if (bubble) {
                        fillBubble(bubble, [
                            { className: 'hi', text: `${greeting.text} 👋` },
                        ]);
                    }

                    void voice.play(greeting.file);
                }

                break;
            case 'wave':
                target.armRz = 2.55 + Math.sin(s.t * 13) * 0.38;
                target.headZ = -0.12;
                target.mouth = voice.speaking
                    ? 0.45 + voice.level() * 1.8
                    : 1.1;

                if (s.t >= DUR.wave) {
                    startTalk();
                }

                break;
            case 'talk': {
                const item = s.item;
                const count = Math.min(s.line.length, Math.floor(s.t * 34));

                if (item && count !== s.typed) {
                    s.typed = count;
                    renderTalk(item, count);
                }

                target.mouth = voice.speaking
                    ? 0.45 + voice.level() * 1.8
                    : count < s.line.length && !voice.enabled
                      ? 0.45 + Math.abs(Math.sin(s.t * 16)) * 1.4
                      : 0.9;
                target.headX = Math.sin(s.t * 4) * 0.06;
                target.headZ = Math.sin(s.t * 2.2) * 0.07;
                target.armLz = -0.35 + Math.sin(s.t * 3) * 0.15;
                target.armLx = -0.5;

                // Wait for the clip to finish before moving on.
                if (
                    count >= s.line.length &&
                    s.t >= 1.6 &&
                    (s.spoken || s.t > 6)
                ) {
                    if (queued()) {
                        // Keep talking, no walk home in between.
                        s.item = pullNext();
                        startTalk();
                    } else {
                        headHome();
                    }
                }

                break;
            }
            case 'turnBack':
                char.rotation.y = lerp(
                    0,
                    s.back,
                    ease.inOut(progress(DUR.turnBack)),
                );

                if (s.t >= DUR.turnBack) {
                    go('walkIn');
                }

                break;
            case 'walkIn': {
                const k = progress(DUR.walkIn);
                const e = ease.inOut(k);

                char.position.x = lerp(s.spot.x, s.door.x, e);
                char.position.y = lerp(s.spot.y, s.door.y, e);
                char.scale.setScalar(
                    SCALE *
                        lerp(
                            1,
                            0.35,
                            ease.inOut(Math.max(0, (k - 0.35) / 0.65)),
                        ),
                );
                setOpacity(Math.min(1, (1 - k) * 6));
                walkCycle();

                if (k >= 1) {
                    char.visible = false;
                    go('doorClose');
                }

                break;
            }
            case 'doorClose':
                home.doorPivot.rotation.y = lerp(
                    -1.9,
                    0,
                    ease.inOut(progress(DUR.doorClose)),
                );

                if (s.t >= DUR.doorClose) {
                    if (queued()) {
                        // A new message arrived on the way home.
                        s.item = pullNext();
                        go('doorOpen');
                    } else {
                        go('houseOut');
                    }
                }

                break;
            case 'houseOut':
                home.house.scale.setScalar(
                    lerp(HOUSE_SCALE, 22, ease.inOut(progress(DUR.houseOut))),
                );

                if (s.t >= DUR.houseOut) {
                    s.phase = 'done';
                    s.item = null;
                    dispatch(finish());
                }

                break;
            case 'done':
                // A message landed during houseOut: start over instead of unmounting.
                if (queued()) {
                    go('houseIn');
                }

                break;
        }

        // Every joint eases toward its target, so phases never snap.
        const pose = s.pose;

        for (const key of Object.keys(pose) as (keyof Pose)[]) {
            pose[key] = damp(
                pose[key],
                target[key],
                key === 'mouth' ? 30 : 18,
                dt,
            );
        }

        legL.rotation.x = pose.legL;
        legR.rotation.x = pose.legR;
        armL.rotation.x = pose.armLx;
        armR.rotation.x = pose.armRx;
        armR.rotation.z = pose.armRz;
        armL.rotation.z = pose.armLz;
        headPivot.rotation.z = pose.headZ;
        headPivot.rotation.x = pose.headX;
        body.position.y = pose.bob;
        mouth.scale.y = pose.mouth * 0.45;

        const now = state.clock.elapsedTime;

        torso.scale.y = 1 + Math.sin(now * 2.5) * 0.012; // breathing
        eyeL.scale.y = eyeR.scale.y = now % 3.2 < 0.11 ? 0.1 : 1; // blink

        // The bubble follows the head.
        if (char.visible && bubble) {
            const top = new THREE.Vector3(0, 2.95, 0);

            char.localToWorld(top);

            const x = top.x + size.width / 2;
            const y = size.height / 2 - top.y;

            bubble.style.left = `${Math.max(140, Math.min(size.width - 140, x))}px`;
            bubble.style.top = `${y - 8}px`;
        }
    });

    return (
        <>
            <hemisphereLight args={[0xffffff, 0x8a93a8, 1.5]} />
            <directionalLight position={[-0.4, 0.8, 1]} intensity={1.7} />
            <directionalLight
                position={[1, 0.3, -0.6]}
                intensity={0.8}
                color={0xfed7aa}
            />
            <primitive object={home.house} />
            <primitive object={rig.char} />
        </>
    );
}
