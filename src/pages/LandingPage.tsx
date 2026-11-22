import { ArrowRight, ClipboardList, Home, MessageCircle, Users } from 'lucide-react';
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

export function LandingPage() {
  const { user } = useAuth();
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f7f4] text-stone-900">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 sm:pt-14 sm:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-sm font-semibold text-indigo-700 tracking-wide mb-3">
                College roommate matching
              </p>

              <h1
                className="font-display font-bold text-indigo-950 tracking-tight leading-[1.1] text-balance mb-5"
                style={{ fontSize: 'clamp(2.25rem, 4.2vw, 3.6rem)' }}
              >
                Find a roommate who fits your life
              </h1>

              <p className="text-base sm:text-lg text-stone-600 leading-relaxed max-w-xl mb-8">
                Roomie helps college students find compatible roommates by matching lifestyle
                profiles—from study routines and sleep schedules to how you keep shared spaces.
              </p>

              <div className="flex flex-wrap items-center gap-3.5 mb-8">
                {user ? (
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm sm:text-base font-semibold hover:bg-indigo-700 transition-colors shadow-sm whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
                  >
                    <span>Go to dashboard</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/signup"
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm sm:text-base font-semibold hover:bg-indigo-700 transition-colors shadow-sm whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
                    >
                      <span>Sign up</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </Link>
                    <Link
                      to="/login"
                      className="inline-flex items-center justify-center px-6 py-3 min-h-[44px] rounded-xl bg-white text-stone-800 text-sm sm:text-base font-semibold hover:bg-stone-100 transition-colors shadow-[0_2px_10px_-2px_rgba(26,25,43,0.08)] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
                    >
                      Log in
                    </Link>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-stone-500">
                <span>Campus-verified profiles</span>
                <span aria-hidden="true">·</span>
                <span>Lifestyle compatibility</span>
                <span aria-hidden="true">·</span>
                <span>Direct roommate requests</span>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="w-full h-full min-h-[280px] sm:min-h-[360px] rounded-2xl overflow-hidden bg-indigo-50 shadow-[0_10px_34px_-10px_rgba(30,27,75,0.14)]">
                {!imageFailed ? (
                  <img
                    src={HERO_IMAGE_PATH}
                    alt="Warm sunlit shared college apartment living room with two study desks overlooking campus trees"
                    referrerPolicy="no-referrer"
                    onError={() => setImageFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full min-h-[320px] flex flex-col items-center justify-center p-8 bg-gradient-to-br from-indigo-50 via-[#f8f7f4] to-indigo-100 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mb-4 shadow-sm">
                      <Home className="w-7 h-7" aria-hidden="true" />
                    </div>
                    <p className="font-display font-semibold text-indigo-950 text-lg">
                      Shared living made comfortable
                    </p>
                    <p className="text-sm text-stone-600 mt-1 max-w-xs">
                      Find someone on campus who shares your daily rhythm.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* How it works Section */}
        <section id="how-it-works" className="py-16 sm:py-20 border-t border-stone-200/80 bg-white/55">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-12">
              <p className="text-sm font-semibold text-indigo-700 mb-2">How it works</p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-indigo-950 tracking-tight text-balance">
                Three simple steps to find your roommate
              </h2>
              <p className="text-stone-600 mt-3 text-base leading-relaxed">
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
                    className="bg-white rounded-2xl p-7 shadow-[0_2px_16px_-4px_rgba(26,25,43,0.07)] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600">
                          <Icon className="w-5 h-5" aria-hidden="true" />
                        </span>
                        <span className="font-display text-sm font-bold text-indigo-400 tabular-nums">
                          {step.number}
                        </span>
                      </div>

                      <h3 className="font-display text-lg font-bold text-indigo-950 mb-2.5">
                        {step.title}
                      </h3>
                      <p className="text-sm sm:text-[15px] text-stone-600 leading-relaxed">
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
            <div className="bg-white rounded-2xl p-8 sm:p-12 shadow-[0_2px_18px_-4px_rgba(26,25,43,0.07)] grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              <div className="lg:col-span-5">
                <p className="text-sm font-semibold text-indigo-700 mb-2">Built for college life</p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-indigo-950 tracking-tight text-balance mb-4">
                  Compatibility starts with everyday habits
                </h2>
                <p className="text-stone-600 text-base leading-relaxed mb-6">
                  Great roommates do not have to be identical—they just need compatible boundaries
                  around sleep, study time, and shared spaces.
                </p>
                {!user && (
                  <Link
                    to="/signup"
                    className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
                  >
                    <span>Create your account</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                )}
              </div>

              <div className="lg:col-span-7 divide-y divide-stone-200/80">
                {LIFESTYLE_PILLARS.map((pillar) => (
                  <div key={pillar.title} className="py-4 first:pt-0 last:pb-0">
                    <h3 className="font-display text-base font-semibold text-indigo-950 mb-1">
                      {pillar.title}
                    </h3>
                    <p className="text-sm text-stone-600 leading-relaxed">{pillar.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
