import { Composition } from "remotion";
import { ProductSpotlight } from "./compositions/ProductSpotlight";
import { LimitedOffer } from "./compositions/LimitedOffer";
import { SocialProof } from "./compositions/SocialProof";
import { ReelOpener } from "./compositions/ReelOpener";
import { StatsDrop } from "./compositions/StatsDrop";
import { StoryCTA } from "./compositions/StoryCTA";
import { BeforeAfter } from "./compositions/BeforeAfter";
import { UGCFrame } from "./compositions/UGCFrame";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComp = React.ComponentType<any>;

const W = 1080, H = 1920, FPS = 30;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="ProductSpotlight"
      component={ProductSpotlight as AnyComp}
      durationInFrames={180} fps={FPS} width={W} height={H}
      defaultProps={{ headline: "New Arrival", subtext: "Fresh, bold, and made for you.", cta: "Shop Now", brandName: "Your Brand", primaryColor: "#6d28d9", accentColor: "#a78bfa" }}
    />
    <Composition
      id="LimitedOffer"
      component={LimitedOffer as AnyComp}
      durationInFrames={150} fps={FPS} width={W} height={H}
      defaultProps={{ offerText: "50% OFF", subtext: "This weekend only.", cta: "Claim Deal", brandName: "Your Brand", urgencyLabel: "48 hrs left", primaryColor: "#991b1b", accentColor: "#ef4444" }}
    />
    <Composition
      id="SocialProof"
      component={SocialProof as AnyComp}
      durationInFrames={210} fps={FPS} width={W} height={H}
      defaultProps={{ quote: "Honestly the best I've ever tried. Came back three times.", customerName: "Sarah M.", rating: 5, brandName: "Your Brand", primaryColor: "#6d28d9", accentColor: "#a78bfa" }}
    />
    <Composition
      id="ReelOpener"
      component={ReelOpener as AnyComp}
      durationInFrames={90} fps={FPS} width={W} height={H}
      defaultProps={{ brandName: "Your Brand", tagline: "Made different", primaryColor: "#6d28d9", accentColor: "#a78bfa" }}
    />
    <Composition
      id="StatsDrop"
      component={StatsDrop as AnyComp}
      durationInFrames={210} fps={FPS} width={W} height={H}
      defaultProps={{ headline: "The numbers speak.", stats: [{ value: "10K+", label: "Customers" }, { value: "4.9★", label: "Avg rating" }, { value: "3yrs", label: "In business" }, { value: "#1", label: "In our city" }], brandName: "Your Brand", primaryColor: "#6d28d9", accentColor: "#a78bfa" }}
    />
    <Composition
      id="StoryCTA"
      component={StoryCTA as AnyComp}
      durationInFrames={180} fps={FPS} width={W} height={H}
      defaultProps={{ headline: "You deserve the best.", subtext: "Come see what everyone's talking about.", cta: "Visit Us Today", brandName: "Your Brand", primaryColor: "#6d28d9", accentColor: "#7c3aed" }}
    />
    <Composition
      id="BeforeAfter"
      component={BeforeAfter as AnyComp}
      durationInFrames={180} fps={FPS} width={W} height={H}
      defaultProps={{ beforeText: "Settling for less", afterText: "The real deal", beforeLabel: "Before", afterLabel: "After", brandName: "Your Brand", primaryColor: "#6d28d9", accentColor: "#a78bfa" }}
    />
    <Composition
      id="UGCFrame"
      component={UGCFrame as AnyComp}
      durationInFrames={180} fps={FPS} width={W} height={H}
      defaultProps={{ creatorHandle: "foodiename", caption: "Can't believe how good this was 🔥", brandName: "Your Brand", primaryColor: "#6d28d9", accentColor: "#a78bfa" }}
    />
  </>
);
