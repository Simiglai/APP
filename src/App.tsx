import { useState } from 'react';
import { StoreProvider, useStore } from './lib/store';
import Onboarding from './screens/Onboarding';
import Today from './screens/Today';
import Goals from './screens/Goals';
import Train from './screens/Train';
import Partner from './screens/Partner';
import Me from './screens/Me';
import WeeklyReview from './screens/WeeklyReview';
import { IconGoals, IconMe, IconPartner, IconToday, IconTrain } from './icons';

const TABS = [
  { id: 'today', label: 'Today', Icon: IconToday },
  { id: 'goals', label: 'Goals', Icon: IconGoals },
  { id: 'train', label: 'Train', Icon: IconTrain },
  { id: 'partner', label: 'Coach', Icon: IconPartner },
  { id: 'me', label: 'Me', Icon: IconMe },
] as const;
type Tab = (typeof TABS)[number]['id'] | 'week';

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
        {tab === 'today' && <Today onShare={() => go('partner')} onWeekly={() => go('week')} />}
        {tab === 'goals' && <Goals />}
        {tab === 'train' && <Train />}
        {tab === 'partner' && <Partner />}
        {tab === 'me' && <Me onWeekly={() => go('week')} />}
        {tab === 'week' && <WeeklyReview onBack={() => go('me')} />}
      </main>
      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'is-on' : ''} onClick={() => go(t.id)}>
            <t.Icon />
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
