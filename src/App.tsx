import { useState } from 'react';
import { StoreProvider, useStore } from './lib/store';
import Onboarding from './screens/Onboarding';
import Today from './screens/Today';
import Goals from './screens/Goals';
import Train from './screens/Train';
import Mind from './screens/Mind';
import Partner from './screens/Partner';
import Me from './screens/Me';
import WeeklyReview from './screens/WeeklyReview';
import Membership from './screens/Membership';
import { IconMind, IconMe, IconPartner, IconToday, IconTrain } from './icons';

const TABS = [
  { id: 'today', label: 'Today', Icon: IconToday },
  { id: 'train', label: 'Train', Icon: IconTrain },
  { id: 'mind', label: 'Mind', Icon: IconMind },
  { id: 'partner', label: 'Coach', Icon: IconPartner },
  { id: 'me', label: 'Me', Icon: IconMe },
] as const;
/** Sub-screens reachable from tabs but not shown in the tab bar. */
type Screen = (typeof TABS)[number]['id'] | 'week' | 'goals' | 'membership';
const PARENT: Partial<Record<Screen, Screen>> = { week: 'me', goals: 'me', membership: 'me' };

function Shell() {
  const { state } = useStore();
  const [screen, setScreen] = useState<Screen>('today');
  const [back, setBack] = useState<Screen>('me');

  if (!state.profile.onboarded) return <main className="app"><Onboarding /></main>;

  const go = (s: Screen) => {
    if (PARENT[s]) setBack(TABS.some((t) => t.id === screen) ? screen : 'me');
    setScreen(s);
    window.scrollTo({ top: 0 });
  };
  const activeTab = PARENT[screen] ? back : screen;
  const upgrade = () => go('membership');

  return (
    <>
      <main className="app">
        {screen === 'today' && <Today onShare={() => go('partner')} onWeekly={() => go('week')} />}
        {screen === 'train' && <Train onUpgrade={upgrade} />}
        {screen === 'mind' && <Mind onUpgrade={upgrade} />}
        {screen === 'partner' && <Partner />}
        {screen === 'me' && <Me onWeekly={() => go('week')} onGoals={() => go('goals')} onMembership={upgrade} />}
        {screen === 'goals' && <Goals onBack={() => go(back)} />}
        {screen === 'week' && <WeeklyReview onBack={() => go(back)} />}
        {screen === 'membership' && <Membership onBack={() => go(back)} />}
      </main>
      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={activeTab === t.id ? 'is-on' : ''} onClick={() => go(t.id)}>
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
