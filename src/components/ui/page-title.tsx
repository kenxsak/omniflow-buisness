
import type { FC } from 'react';

interface PageTitleProps {
  title: string;
  description?: string;
}

const PageTitle: FC<PageTitleProps> = ({ title, description }) => {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
    </div>
  );
};

export default PageTitle;
