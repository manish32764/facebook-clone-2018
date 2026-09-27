import { Link as RouterLink, type LinkProps as RouterLinkProps } from 'react-router-dom';
import { classNames } from '@/utils/format';
import styles from './Link.module.css';

export interface AppLinkProps extends RouterLinkProps {
  bold?: boolean;
  subtle?: boolean;
  onBrand?: boolean;
}

/** Router-aware link that carries the 2018 link colour by default. */
export function Link({ bold, subtle, onBrand, className, children, ...rest }: AppLinkProps) {
  return (
    <RouterLink
      className={classNames(
        styles.link,
        bold && styles.bold,
        subtle && styles.subtle,
        onBrand && styles.onBrand,
        className,
      )}
      {...rest}
    >
      {children}
    </RouterLink>
  );
}
