import { X } from 'lucide-react';
import { useState } from 'react';
import { Logo } from './Logo';

type FooterTopic = 'about' | 'safety' | 'contact' | null;

export function Footer() {
  const [topic, setTopic] = useState<FooterTopic>(null);

  return (
    <>
      <footer className="border-t border-stone-200/80 bg-[#f8f7f4] mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-7 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Logo to="/" />
            <span className="text-xs text-stone-500">© 2026 Roomie</span>
          </div>

          <nav className="flex flex-wrap items-center gap-6 text-sm font-medium text-stone-600" aria-label="Footer navigation">
            <button
              type="button"
              onClick={() => setTopic('about')}
              className="hover:text-indigo-700 transition-colors cursor-pointer py-1"
            >
              About
            </button>
            <button
              type="button"
              onClick={() => setTopic('safety')}
              className="hover:text-indigo-700 transition-colors cursor-pointer py-1"
            >
              Safety tips
            </button>
            <button
              type="button"
              onClick={() => setTopic('contact')}
              className="hover:text-indigo-700 transition-colors cursor-pointer py-1"
            >
              Contact
            </button>
          </nav>
        </div>
      </footer>

      {topic && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="footer-topic-title"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4 mb-3">
              <h2 id="footer-topic-title" className="font-display text-lg font-bold text-indigo-950">
                {topic === 'about' && 'About Roomie'}
                {topic === 'safety' && 'Roommate Safety Tips'}
                {topic === 'contact' && 'Contact Roomie'}
              </h2>
              <button
                type="button"
                onClick={() => setTopic(null)}
                className="w-9 h-9 inline-flex items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100 cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {topic === 'about' && (
              <p className="text-sm text-stone-600 leading-relaxed">
                Roomie helps college students find compatible roommates based on daily schedules,
                cleanliness, study habits, and shared-space boundaries—so you can move in with clarity.
              </p>
            )}

            {topic === 'safety' && (
              <ul className="space-y-2.5 text-sm text-stone-600 leading-relaxed list-disc pl-5">
                <li>Always meet prospective roommates in public campus spaces or cafes first.</li>
                <li>Never share financial details, UPI PINs, bank OTPs, or advance deposits online before verifying a flat in person.</li>
                <li>Keep conversations on Roomie until you feel comfortable, and use Report or Block anytime something feels off.</li>
              </ul>
            )}

            {topic === 'contact' && (
              <p className="text-sm text-stone-600 leading-relaxed">
                Have feedback or need help with your account? Reach our student support team at{' '}
                <a
                  href="mailto:support@roomie-campus.app"
                  className="font-semibold text-indigo-700 hover:underline"
                >
                  support@roomie-campus.app
                </a>
                .
              </p>
            )}

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setTopic(null)}
                className="px-4 py-2 min-h-[40px] rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
