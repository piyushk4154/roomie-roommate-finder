import { ArrowRight, Building2, ClipboardList, Home, MessageCircle, ShieldCheck, Users } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Footer } from '../components/Footer';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../services/AuthContext';

const HERO_IMAGE_PATH = '/src/assets/images/hero_roomie_living_1795349964343.jpg';

const STEPS = [
  {
    number: '01',
    title: 'Create profile',
    description:
      'Add your college, city, sleep schedule, study habits, and shared-space expectations in a few quick minutes.',
    icon: ClipboardList,
  },
  {
    number: '02',
    title: 'Get matched',
    description:
      'Discover compatible students at your campus ranked by daily lifestyle fit rather than random luck.',
    icon: Users,
  },
  {
    number: '03',
    title: 'Connect',
    description:
      'Send a roommate request, chat directly about housing plans, and move in feeling confident.',
    icon: MessageCircle,
  },
];

const LIFESTYLE_PILLARS = [
  {
    title: 'Sleep & quiet hours',
    detail: 'Match early risers with early risers and night owls with fellow late-night studiers.',
  },
  {
    title: 'Cleanliness & chores',
    detail: 'Align on dish routines, shared common areas, and weekly tidiness before signing a lease.',
  },
  {
    title: 'Campus & budget fit',
    detail: 'Filter within your university and city so every match is actually looking in your area.',
  },
];

const OWNER_HIGHLIGHTS = [
  {
    title: 'List rooms, PGs, and student flats',
    detail: 'Share monthly rent, deposit, bed availability, amenities, and house rules in minutes.',
    icon: Building2,
  },
  {
    title: 'Receive pre-screened enquiries',
    detail: 'See each student’s college, course, and lifestyle summary before accepting.',
    icon: ShieldCheck,
  },
  {
    title: 'Keep contact details private until acceptance',
    detail: 'Your email stays private, and your phone is shared only with enquiries you accept.',
    icon: MessageCircle,
  },
];

export function LandingPage() {
  const { user } = useAuth();
  const [imageFailed, setImageFailed] = useState(false);
  const dashboardPath = user?.role === 'owner' ? '/owner' : '/dashboard';

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f7f4] dark:bg-slate-950 text-stone-900 dark:text-slate-100">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 sm:pt-14 sm:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-400 tracking-wide mb-3">
                College roommate &amp; student housing matching
              </p>

              <h1
                className="font-display font-bold text-indigo-950 dark:text-slate-50 tracking-tight leading-[1.1] text-balance mb-5"
                style={{ fontSize: 'clamp(2.25rem, 4.2vw, 3.6rem)' }}
              >
                Find a roommate who fits your life
              </h1>

              <p className="text-base sm:text-lg text-stone-600 dark:text-slate-300 leading-relaxed max-w-xl mb-8">
                Roomie helps college students find compatible roommates by matching lifestyle
                profiles—and discover nearby PGs, shared flats, and student rooms whose house rules
                fit how you live.
              </p>

              <div className="flex flex-wrap items-center gap-3.5 mb-8">
                {user ? (
                  <Link
                    to={dashboardPath}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm sm:text-base font-semibold hover:bg-indigo-700 transition-colors shadow-sm whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
                  >
                    <span>Go to dashboard</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/signup"
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm sm:text-base font-semibold hover:bg-indigo-700 transition-colors shadow-sm whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
                    >
                      <span>Sign up</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </Link>
                    <Link
                      to="/login"
                      className="inline-flex items-center justify-center px-6 py-3 min-h-[44px] rounded-xl bg-white dark:bg-slate-800 border border-transparent dark:border-slate-700 text-stone-800 dark:text-slate-100 text-sm sm:text-base font-semibold hover:bg-stone-100 dark:hover:bg-slate-700 transition-colors shadow-[0_2px_10px_-2px_rgba(26,25,43,0.08)] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
                    >
                      Log in
                    </Link>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-stone-500 dark:text-slate-400">
                <span>Campus-verified profiles</span>
                <span aria-hidden="true">·</span>
                <span>Lifestyle compatibility</span>
                <span aria-hidden="true">·</span>
                <span>Student rooms &amp; PGs</span>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="w-full h-full min-h-[280px] sm:min-h-[360px] rounded-2xl overflow-hidden bg-indigo-50 dark:bg-slate-900 border border-transparent dark:border-slate-800 shadow-[0_10px_34px_-10px_rgba(30,27,75,0.14)] dark:shadow-none">
                {!imageFailed ? (
                  <img
                    src={HERO_IMAGE_PATH}
                    alt="Warm sunlit shared college apartment living room with two study desks overlooking campus trees"
                    referrerPolicy="no-referrer"
                    onError={() => setImageFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full min-h-[320px] flex flex-col items-center justify-center p-8 bg-gradient-to-br from-indigo-50 via-[#f8f7f4] to-indigo-100 dark:from-slate-900 dark:via-slate-950 dark:to-indigo-950/50 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mb-4 shadow-sm">
                      <Home className="w-7 h-7" aria-hidden="true" />
                    </div>
                    <p className="font-display font-semibold text-indigo-950 dark:text-slate-100 text-lg">
                      Shared living made comfortable
                    </p>
                    <p className="text-sm text-stone-600 dark:text-slate-300 mt-1 max-w-xs">
                      Find someone on campus who shares your daily rhythm.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* How it works Section */}
        <section id="how-it-works" className="py-16 sm:py-20 border-t border-stone-200/80 dark:border-slate-800 bg-white/55 dark:bg-slate-900/50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-12">
              <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-400 mb-2">How it works</p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-indigo-950 dark:text-slate-100 tracking-tight text-balance">
                Three simple steps to find your roommate
              </h2>
              <p className="text-stone-600 dark:text-slate-300 mt-3 text-base leading-relaxed">
                Skip endless group chats and guesswork. Share how you live and connect with students
                who want the same home environment.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {STEPS.map((step) => {
                const Icon = step.icon;
                return (
                  <article
                    key={step.number}
                    className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl p-7 shadow-[0_2px_16px_-4px_rgba(26,25,43,0.07)] dark:shadow-none flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400">
                          <Icon className="w-5 h-5" aria-hidden="true" />
                        </span>
                        <span className="font-display text-sm font-bold text-indigo-400 dark:text-indigo-500 tabular-nums">
                          {step.number}
                        </span>
                      </div>

                      <h3 className="font-display text-lg font-bold text-indigo-950 dark:text-slate-100 mb-2.5">
                        {step.title}
                      </h3>
                      <p className="text-sm sm:text-[15px] text-stone-600 dark:text-slate-300 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Built for students section */}
        <section id="built-for-students" className="py-16 sm:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl p-8 sm:p-12 shadow-[0_2px_18px_-4px_rgba(26,25,43,0.07)] dark:shadow-none grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              <div className="lg:col-span-5">
                <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-400 mb-2">Built for college life</p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-indigo-950 dark:text-slate-100 tracking-tight text-balance mb-4">
                  Compatibility starts with everyday habits
                </h2>
                <p className="text-stone-600 dark:text-slate-300 text-base leading-relaxed mb-6">
                  Great roommates do not have to be identical—they just need compatible boundaries
                  around sleep, study time, and shared spaces.
                </p>
                {!user && (
                  <Link
                    to="/signup"
                    className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
                  >
                    <span>Create your account</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                )}
              </div>

              <div className="lg:col-span-7 divide-y divide-stone-200/80 dark:divide-slate-800">
                {LIFESTYLE_PILLARS.map((pillar) => (
                  <div key={pillar.title} className="py-4 first:pt-0 last:pb-0">
                    <h3 className="font-display text-base font-semibold text-indigo-950 dark:text-slate-100 mb-1">
                      {pillar.title}
                    </h3>
                    <p className="text-sm text-stone-600 dark:text-slate-300 leading-relaxed">{pillar.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* For room and PG owners section */}
        <section id="for-owners" className="pb-16 sm:pb-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-indigo-950 dark:bg-slate-900 border border-transparent dark:border-slate-800 text-white rounded-2xl p-8 sm:p-12 shadow-[0_8px_30px_-8px_rgba(30,27,75,0.28)] dark:shadow-none">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
                <div className="max-w-2xl">
                  <p className="text-sm font-semibold text-indigo-300 mb-2">
                    For room and PG owners
                  </p>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-balance">
                    Connect with verified college tenants who fit your house rules
                  </h2>
                  <p className="text-indigo-100/85 dark:text-slate-300 text-base leading-relaxed mt-3">
                    List single rooms, shared PGs, hostels, or student flats. Students see upfront if
                    their daily habits match your property rules before sending an enquiry.
                  </p>
                </div>

                {!user && (
                  <Link
                    to="/signup"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-xl bg-white text-indigo-950 text-sm font-semibold hover:bg-indigo-50 transition-colors whitespace-nowrap shrink-0 self-start lg:self-auto"
                  >
                    <span>List your property</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {OWNER_HIGHLIGHTS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="rounded-xl bg-white/10 dark:bg-slate-800/70 border border-white/10 dark:border-slate-700/80 p-5"
                    >
                      <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-500/30 text-indigo-200 mb-3.5">
                        <Icon className="w-4 h-4" aria-hidden="true" />
                      </span>
                      <h3 className="font-display text-base font-bold text-white mb-1.5">
                        {item.title}
                      </h3>
                      <p className="text-sm text-indigo-100/80 dark:text-slate-300 leading-relaxed">
                        {item.detail}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
