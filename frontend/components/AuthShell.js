import AnimatedBackground from "@/components/AnimatedBackground";

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="dream-page">
      <AnimatedBackground />
      <div className="dream-card">
        <h1>{title}</h1>
        {subtitle && <p className="dream-sub">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}