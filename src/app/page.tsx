import Link from 'next/link';

const features = [
  {
    icon: '🗺️',
    title: 'Territory Management',
    description:
      'Organize your ministry territories with intuitive maps and location-based assignments.',
  },
  {
    icon: '👥',
    title: 'Team Coordination',
    description: 'Assign routes and tasks to congregation members and track progress in real time.',
  },
  {
    icon: '📋',
    title: 'Route Planning',
    description: 'Plan efficient routes for your ministry work and never miss an address.',
  },
  {
    icon: '📊',
    title: 'Progress Tracking',
    description: 'Monitor completion rates and keep detailed records of ministry activities.',
  },
  {
    icon: '🔒',
    title: 'Role-Based Access',
    description: 'Control access with roles for admins, service overseers, and territory servants.',
  },
  {
    icon: '📱',
    title: 'Mobile First',
    description: 'Fully responsive design that works seamlessly on phones, tablets, and desktops.',
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-20 sm:py-32 text-center">
          <div className="text-6xl mb-6">📍</div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Ministry Planner
          </h1>
          <p className="text-xl sm:text-2xl text-blue-100 max-w-3xl mx-auto mb-10">
            The all-in-one platform for managing congregation territories, routes, and ministry
            assignments — organized, efficient, and accessible anywhere.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center px-8 py-3 text-base font-semibold rounded-xl bg-white text-blue-700 hover:bg-blue-50 transition-colors shadow-lg"
            >
              Get Started Free
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center px-8 py-3 text-base font-semibold rounded-xl border-2 border-white text-white hover:bg-white/10 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything you need to organize your ministry
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Built for congregations of all sizes. Simple to use, powerful when you need it.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to get organized?</h2>
          <p className="text-lg text-gray-600 mb-8">
            Join your congregation on Ministry Planner and start managing territories with ease.
          </p>
          <Link
            href="/auth/register"
            className="inline-flex items-center justify-center px-8 py-3 text-base font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-md"
          >
            Create Your Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Ministry Planner. Built for congregations.</p>
        </div>
      </footer>
    </div>
  );
}
