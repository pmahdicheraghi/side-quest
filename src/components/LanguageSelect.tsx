import type { ChangeEvent, ReactElement } from 'react';
import { useI18n, type Language } from '../app/i18n';
import { Icon } from './react-layout';

export function LanguageSelect(): ReactElement {
  const { language, setLanguage, t } = useI18n();

  const changeLanguage = (event: ChangeEvent<HTMLSelectElement>) => {
    setLanguage(event.target.value as Language);
  };

  return (
    <label className="language-select">
      <span className="sr-only">{t('language')}</span>
      <select value={language} onChange={changeLanguage} aria-label={t('language')}>
        <option value="en" dir="ltr">
          English
        </option>
        <option value="fa" dir="rtl">
          فارسی
        </option>
      </select>
      <Icon name="chevronDown" />
    </label>
  );
}
