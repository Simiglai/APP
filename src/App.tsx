import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { StoreProvider, useStore } from './lib/store';
import { supabase } from './lib/supabase';
import Auth from './screens/Auth';
import Coach from './screens/Coach';
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
  const { state, activeTier } = useStore();
  const [screen, setScreen] = useState<Screen>(() => (new URLSearchParams(location.search).has('checkout') ? 'membership' : 'today'));
  const [back, setBack] = useState<Screen>('me');

  if (state.profile.role === 'coach') return <Coach />;
  if (!state.profile.onboarded) return <main className="app"><Onboarding /></main>;
  if (!activeTier) return <main className="app"><Membership gate /></main>;

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
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <div className="splash"><div className="spinner" aria-label="Loading" /></div>;
  if (!session) return <main className="app"><Auth /></main>;
  return (
    // key: a different account gets a fresh store
    <StoreProvider key={session.user.id} userId={session.user.id} email={session.user.email ?? ''}>
      <Shell />
    </StoreProvider>
  );
}
