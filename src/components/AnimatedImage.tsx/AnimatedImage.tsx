'use client'

import Image from "next/image";
import { useSpring, to, animated } from "@react-spring/web";
import { useGesture } from "react-use-gesture";
import { type ComponentProps, type FC, useRef } from "react";

const calcX = (y: number, ly: number) =>
  -(y - ly - window.innerHeight / 2) / 20;
const calcY = (x: number, lx: number) => (x - lx - window.innerWidth / 2) / 20;

type Props = ComponentProps<'img'> & {disabled?: boolean};

export const AnimatedImage: FC<Props> = (props) => {
  const {disabled} = props;
  const [{ x, y, rotateX, rotateY, rotateZ, zoom, scale }, api] = useSpring(
    () => ({
        rotateX: 0,
        rotateY: 0,
        rotateZ: 0,
        scale: 1,
        zoom: 0,
        x: 0,
        y: 0,
        config: { mass: 5, tension: 350, friction: 40 },
      }),
  );

  const domTarget = useRef(null);
  useGesture(
    {
      onMove: ({ xy: [px, py] }) =>
        !disabled && api({
          rotateX: calcX(py, y.get()),
          rotateY: calcY(px, x.get()),
          scale: 1.1,
        }),
      onHover: ({ hovering }) =>
        !disabled && !hovering && api({ rotateX: 0, rotateY: 0, scale: 1 }),
    },
    { domTarget, eventOptions: { passive: true} },
  );
  return (
    <animated.div
      ref={domTarget}
      style={{
        transform: "perspective(600px)",
        x,
        y,
        scale: to([scale, zoom], (s, z) => s + z),
        rotateX,
        rotateY,
        rotateZ,
      }}
    >
      <img {...props}/>
    </animated.div>
  );
};
