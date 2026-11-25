import React from "react";
import { Composition } from "remotion";
import { PisaShort, PISA_FRAMES } from "./videos/pisa/Pisa";
import { NoonShort, NOON_FRAMES } from "./videos/noon/Noon";
import { WishShort } from "./videos/wish/Wish";
import { DURS } from "./videos/wish/story";
import { FlightShort, FLIGHT_FRAMES } from "./videos/flight/Flight";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="PisaShort" component={PisaShort} durationInFrames={PISA_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="FlightShort" component={FlightShort} durationInFrames={FLIGHT_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="NoonShort" component={NoonShort} durationInFrames={NOON_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="WishPart1" component={WishShort} durationInFrames={DURS[1]} fps={30} width={1080} height={1920} defaultProps={{ part: 1 }} />
    <Composition id="WishPart2" component={WishShort} durationInFrames={DURS[2]} fps={30} width={1080} height={1920} defaultProps={{ part: 2 }} />
  </>
);
