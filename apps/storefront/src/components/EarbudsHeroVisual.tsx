export function EarbudsHeroVisual() {
  return (
    <div className="editorial-earbuds" aria-hidden="true">
      <div className="editorial-earbuds-shadow" />
      <div className="editorial-earbuds-case">
        <div className="editorial-earbuds-lid">
          <span className="editorial-earbuds-lid-inner" />
        </div>
        <div className="editorial-earbuds-case-inner">
          <span className="editorial-earbuds-slot slot-left" />
          <span className="editorial-earbuds-slot slot-right" />
          <span className="editorial-earbuds-led" />
        </div>
      </div>
      <div className="editorial-earbud earbud-left">
        <span className="earbud-speaker" />
        <span className="earbud-stem" />
      </div>
      <div className="editorial-earbud earbud-right">
        <span className="earbud-speaker" />
        <span className="earbud-stem" />
      </div>
      <span className="editorial-signal signal-one" />
      <span className="editorial-signal signal-two" />
      <span className="editorial-signal signal-three" />
    </div>
  );
}
