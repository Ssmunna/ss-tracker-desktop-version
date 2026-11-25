import { Canvas } from '@react-three/fiber';
import { Provider, ReactReduxContext } from 'react-redux';
import { useContext } from 'react';

import MascotScene from './MascotScene';

type SceneProps = React.ComponentProps<typeof MascotScene>;

/** The only module that imports three.js and react-three-fiber, so it is loaded on demand. */
export default function MascotCanvas(props: SceneProps) {
    // The canvas is a separate React root: hand it the store so the scene can read the queue.
    const redux = useContext(ReactReduxContext);

    return (
        <Canvas
            orthographic
            camera={{ position: [0, 0, 1000], zoom: 1, near: -3000, far: 3000 }}
            dpr={[1, 2]}
            gl={{ alpha: true, antialias: true }}
            style={{
                position: 'fixed',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 60,
            }}
            aria-hidden="true"
        >
            {redux ? (
                <Provider store={redux.store}>
                    <MascotScene {...props} />
                </Provider>
            ) : null}
        </Canvas>
    );
}
