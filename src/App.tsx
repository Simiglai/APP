import { useState } from 'react';
import { StoreProvider, useStore } from './lib/store';
import Onboarding from './screens/Onboarding';
import Today from './screens/Today';
import Goals from './screens/Goals';
import Train from './screens/Train';
import Partner from './screens/Partner';
import Me from './screens/Me';

const TABS = [
  { id: 'today', label: 'Today', icon: '☀️' },
  { id: 'goals', label: 'Goals', icon: '🎯' },
  { id: 'train', label: 'Train', icon: '💪' },
  { id: 'partner', label: 'Partner', icon: '🤝' },
  { id: 'me', label: 'Me', icon: '🪞' },
] as const;
type Tab = (typeof TABS)[number]['id'];

function Shell() {
  const { state } = useStore();
  const [tab, setTab] = useState<Tab>('today');

  if (!state.profile.onboarded) return <main className="app"><Onboarding /></main>;

  const go = (t: Tab) => {
    setTab(t);
    window.scrollTo({ top: 0 });
  };

  return (
    <>
      <main className="app">
        {tab === 'today' && <Today onShare={() => go('partner')} />}
        {tab === 'goals' && <Goals />}
        {tab === 'train' && <Train />}
        {tab === 'partner' && <Partner />}
        {tab === 'me' && <Me />}
      </main>
      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'is-on' : ''} onClick={() => go(t.id)}>
            <span aria-hidden>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
