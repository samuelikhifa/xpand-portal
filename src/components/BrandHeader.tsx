// import xpandLogo from "@/assets/xpand-logo.png";
import jciLogo from "@/assets/jci-uniben-logo.png";

export function BrandHeader({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 mb-6">
      <img src={jciLogo} alt="XPAND" className="h-16 w-auto" />
      <div className="flex items-center gap-2">
        <img src={jciLogo} alt="JCI Nigeria UNIBEN" className="h-8 w-auto" />
      </div>
      {subtitle && (
        <p className="text-sm text-muted-foreground text-center">{subtitle}</p>
      )}
    </div>
  );
}
