export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="ug-page-header">
      <div>
        <h1 className="ug-page-title">{title}</h1>
        {subtitle ? <p className="ug-page-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div style={{ display: "flex", gap: "0.6rem" }}>{actions}</div> : null}
    </div>
  );
}
