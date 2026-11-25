import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/**
 * Procedural mascot and house, built from primitives (no model file to download).
 * The mascot wears the office polo: the front print is `shirtFront` (cropped from the uniform
 * design), the collar, placket and cuffs are modelled in the brand orange.
 *
 * To use a real Blender GLB later, the scene only needs the parts named in `MascotRig`.
 * Colours are three.js numbers: they are not UI colours, so the style guard does not apply.
 */

export interface MascotRig {
    char: THREE.Group;
    body: THREE.Group;
    torso: THREE.Mesh;
    headPivot: THREE.Group;
    mouth: THREE.Mesh;
    eyeL: THREE.Mesh;
    eyeR: THREE.Mesh;
    armL: THREE.Group;
    armR: THREE.Group;
    legL: THREE.Group;
    legR: THREE.Group;
    /** Every material, so the whole character can fade in and out. */
    materials: THREE.Material[];
}

export interface HouseRig {
    house: THREE.Group;
    doorPivot: THREE.Group;
    /** Where the mascot steps out of the door. */
    doorMark: THREE.Object3D;
}

const mat = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({
        color,
        roughness: 0.62,
        metalness: 0,
        ...extra,
    });

export function buildCharacter({
    shirtFront,
    orange = 0xe8622f,
    cuff = 0xd8552c,
}: {
    shirtFront: string;
    orange?: number;
    cuff?: number;
}): MascotRig {
    const C = {
        skin: 0xf1c27d,
        hair: 0x2b1d14,
        pants: 0x2f3a4f,
        shoe: 0x1d1d22,
    };
    const materials: THREE.Material[] = [];
    const M = (color: number, extra?: THREE.MeshStandardMaterialParameters) => {
        const material = mat(color, extra);

        materials.push(material);

        return material;
    };

    const char = new THREE.Group();
    const body = new THREE.Group();

    char.add(body);

    // Half lit, half self-lit, so the print stays crisp and the white matches under the scene lights.
    const white = { emissive: 0x6e6e6e, roughness: 0.85 };
    const tex = new THREE.TextureLoader().load(shirtFront);

    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;

    const shirtSide = M(0xb4b4b4, white);
    const shirtFrontMat = M(0xb4b4b4, {
        ...white,
        map: tex,
        emissiveMap: tex,
        emissive: 0xffffff,
        emissiveIntensity: 0.43,
        color: 0xffffff,
    });
    const sleeveMat = M(0xb4b4b4, white);
    const collarMat = M(orange, { side: THREE.DoubleSide });
    const cuffMat = M(cuff);

    // The polo hangs over the hips, so the torso is tall enough for the print to keep its proportions.
    const torso = new THREE.Mesh(
        new RoundedBoxGeometry(0.84, 1.2, 0.52, 4, 0.12),
        [shirtSide, shirtSide, shirtSide, shirtSide, shirtFrontMat, shirtSide],
    );

    torso.position.y = 1.4;
    body.add(torso);

    // Polo collar: stand-up band and two collar points.
    const band = new THREE.Mesh(
        new THREE.CylinderGeometry(0.165, 0.215, 0.12, 32, 1, true),
        collarMat,
    );

    band.position.y = 2.0;
    body.add(band);

    for (const side of [-1, 1]) {
        const flap = new THREE.Mesh(
            new RoundedBoxGeometry(0.2, 0.12, 0.035, 2, 0.015),
            collarMat,
        );

        flap.position.set(0.085 * side, 1.95, 0.25);
        flap.rotation.set(-0.35, 0, -0.6 * side);
        body.add(flap);
    }

    const headPivot = new THREE.Group();

    headPivot.position.y = 1.95;
    body.add(headPivot);

    const skin = M(C.skin);
    const neck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.11, 0.14, 12),
        skin,
    );
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 24), skin);
    const hair = new THREE.Mesh(
        new THREE.SphereGeometry(
            0.445,
            32,
            24,
            0,
            Math.PI * 2,
            0,
            Math.PI * 0.52,
        ),
        M(C.hair),
    );
    const eyeGeo = new THREE.SphereGeometry(0.052, 16, 12);
    const eyeMat = M(0x1b1b1f);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    const browGeo = new RoundedBoxGeometry(0.13, 0.035, 0.03, 2, 0.015);
    const browMat = M(C.hair);
    const browL = new THREE.Mesh(browGeo, browMat);
    const browR = new THREE.Mesh(browGeo, browMat);
    const mouth = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 16, 12),
        M(0x9b2c2c),
    );
    const earGeo = new THREE.SphereGeometry(0.08, 12, 8);
    const earL = new THREE.Mesh(earGeo, skin);
    const earR = new THREE.Mesh(earGeo, skin);

    neck.position.y = 0.03;
    head.position.y = 0.44;
    hair.position.set(0, 0.47, -0.035);
    hair.rotation.x = -0.32;
    eyeL.position.set(-0.14, 0.47, 0.385);
    eyeR.position.set(0.14, 0.47, 0.385);
    browL.position.set(-0.14, 0.58, 0.37);
    browR.position.set(0.14, 0.58, 0.37);
    mouth.scale.set(1.5, 0.45, 0.5);
    mouth.position.set(0, 0.3, 0.39);
    earL.position.set(-0.41, 0.44, 0);
    earR.position.set(0.41, 0.44, 0);
    headPivot.add(
        neck,
        head,
        hair,
        eyeL,
        eyeR,
        browL,
        browR,
        mouth,
        earL,
        earR,
    );

    const makeArm = (side: number) => {
        const pivot = new THREE.Group();
        const sleeve = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.165, 0.3, 16),
            sleeveMat,
        );
        const cuffRing = new THREE.Mesh(
            new THREE.CylinderGeometry(0.168, 0.172, 0.07, 16),
            cuffMat,
        );
        const arm = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.095, 0.42, 6, 12),
            skin,
        );
        const hand = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 16, 12),
            skin,
        );

        pivot.position.set(0.49 * side, 1.84, 0);
        sleeve.position.y = -0.1;
        cuffRing.position.y = -0.23;
        arm.position.y = -0.42;
        hand.position.y = -0.76;
        pivot.add(cuffRing, sleeve, arm, hand);
        body.add(pivot);

        return pivot;
    };
    const makeLeg = (side: number) => {
        const pivot = new THREE.Group();
        const leg = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.135, 0.62, 6, 12),
            M(C.pants),
        );
        const shoe = new THREE.Mesh(
            new RoundedBoxGeometry(0.3, 0.16, 0.44, 3, 0.06),
            M(C.shoe),
        );

        pivot.position.set(0.19 * side, 1.0, 0);
        leg.position.y = -0.45;
        shoe.position.set(0, -0.9, 0.06);
        pivot.add(leg, shoe);
        char.add(pivot);

        return pivot;
    };

    const armL = makeArm(-1);
    const armR = makeArm(1);
    const legL = makeLeg(-1);
    const legR = makeLeg(1);

    const shadowMat = new THREE.MeshBasicMaterial({
        color: 0x1b2333,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
    });
    const shadow = new THREE.Mesh(
        new THREE.CircleGeometry(0.55, 32),
        shadowMat,
    );

    materials.push(shadowMat);
    shadow.scale.y = 0.28;
    shadow.position.z = -1;
    char.add(shadow);

    for (const material of materials) {
        material.transparent = true;
        material.userData.baseOpacity = material.opacity;
    }

    return {
        char,
        body,
        torso,
        headPivot,
        mouth,
        eyeL,
        eyeR,
        armL,
        armR,
        legL,
        legR,
        materials,
    };
}

/** The little house the mascot lives in; it pops out exactly on top of the header icon. */
export function buildHouse({
    roof = 0xff6b00,
    door = 0xc2410c,
}: { roof?: number; door?: number } = {}): HouseRig {
    const house = new THREE.Group();
    const inner = new THREE.Group();

    inner.rotation.set(0.22, -0.42, 0);
    inner.position.y = -0.8; // centre the model on the anchor point
    house.add(inner);

    const walls = new THREE.Mesh(
        new RoundedBoxGeometry(1.4, 1.0, 1.2, 3, 0.05),
        mat(0xfff7ed),
    );
    const roofMesh = new THREE.Mesh(
        new THREE.ConeGeometry(1.2, 0.78, 4),
        mat(roof),
    );
    const chimney = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.4, 0.18),
        mat(0x7c2d12),
    );
    const doorway = new THREE.Mesh(
        new THREE.BoxGeometry(0.44, 0.64, 0.02),
        mat(0x431407),
    );
    const doorPivot = new THREE.Group();
    const doorMesh = new THREE.Mesh(
        new RoundedBoxGeometry(0.44, 0.64, 0.05, 2, 0.02),
        mat(door),
    );
    const knob = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 10, 8),
        mat(0xfacc15, { metalness: 0.5, roughness: 0.3 }),
    );
    const win = new THREE.Mesh(
        new RoundedBoxGeometry(0.34, 0.3, 0.03, 2, 0.02),
        mat(0xfde68a, { emissive: 0xfbbf24, emissiveIntensity: 0.35 }),
    );
    const doorMark = new THREE.Object3D();

    walls.position.y = 0.5;
    roofMesh.rotation.y = Math.PI / 4;
    roofMesh.position.y = 1.39;
    chimney.position.set(0.38, 1.55, -0.15);
    doorway.position.set(-0.22, 0.32, 0.605);
    doorPivot.position.set(-0.44, 0.32, 0.62);
    doorMesh.position.x = 0.22;
    knob.position.set(0.14, 0, 0.04);
    doorMesh.add(knob);
    doorPivot.add(doorMesh);
    win.position.set(0.34, 0.58, 0.605);
    doorMark.position.set(-0.22, 0.02, 0.7);
    inner.add(walls, roofMesh, chimney, doorway, doorPivot, win, doorMark);

    return { house, doorPivot, doorMark };
}
