import { useEffect, useState, useMemo } from 'react';
import { PlayCircle, Clock, CheckCircle2, Search, BookOpen, X, Youtube } from 'lucide-react';
import { fetchVideos, fetchWatchedVideoIds, markVideoWatched } from '@/lib/dataAccess';
import type { EducationalVideo, VideoCategory } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { LoadingState, ErrorState } from './ui';

const CATEGORY_META: Record<VideoCategory, { label: string; color: string; bg: string }> = {
  restoration: { label: 'Restoration', color: 'text-accent-700', bg: 'bg-accent-100' },
  pollution: { label: 'Pollution', color: 'text-danger-700', bg: 'bg-danger-100' },
  community: { label: 'Community Action', color: 'text-primary-700', bg: 'bg-primary-100' },
  technique: { label: 'Techniques', color: 'text-teal-700', bg: 'bg-teal-100' },
  policy: { label: 'Policy & Governance', color: 'text-warning-700', bg: 'bg-warning-100' },
};

export function Learn() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<EducationalVideo[]>([]);
  const [watched, setWatched] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<VideoCategory | 'all'>('all');
  const [playing, setPlaying] = useState<EducationalVideo | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [v, w] = await Promise.all([
        fetchVideos(),
        user ? fetchWatchedVideoIds(user.id) : Promise.resolve(new Set<string>()),
      ]);
      setVideos(v);
      setWatched(w);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user]);

  const filtered = useMemo(() => {
    return videos.filter((v) => {
      if (search && !v.title.toLowerCase().includes(search.toLowerCase()) && !v.description.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterCat !== 'all' && v.category !== filterCat) return false;
      return true;
    });
  }, [videos, search, filterCat]);

  const handleMarkWatched = async (videoId: string) => {
    if (!user) return;
    setWatched((prev) => new Set(prev).add(videoId));
    try {
      await markVideoWatched(user.id, videoId);
    } catch {
      // non-fatal
    }
  };

  const watchedCount = watched.size;
  const totalCount = videos.length;
  const progressPct = totalCount > 0 ? Math.round((watchedCount / totalCount) * 100) : 0;

  if (loading) return <LoadingState message="Loading learning resources..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="text-xl font-display font-bold flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary-600" /> Learn to Revive Water Bodies
        </h2>
        <p className="text-sm text-ink-500">
          Educational videos on restoring rivers, lakes, and ponds near you — community action, techniques, and policy.
        </p>
      </div>

      {/* Progress bar */}
      {user && totalCount > 0 && (
        <div className="card p-4 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="font-semibold text-ink-700">Your Learning Progress</span>
              <span className="text-ink-500">{watchedCount} of {totalCount} videos watched</span>
            </div>
            <div className="h-2.5 bg-ink-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary-500 to-teal-500 transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-display font-bold text-primary-700">{progressPct}%</span>
          </div>
        </div>
      )}

      {/* Search + filter */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search videos..."
            className="input pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterCat('all')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              filterCat === 'all' ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
            }`}
          >
            All
          </button>
          {(Object.keys(CATEGORY_META) as VideoCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                filterCat === cat ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
              }`}
            >
              {CATEGORY_META[cat].label}
            </button>
          ))}
        </div>
      </div>

      {/* Video grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((video) => {
          const cat = CATEGORY_META[video.category];
          const isWatched = watched.has(video.id);
          const thumb = `https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`;
          return (
            <div
              key={video.id}
              className="card card-hover overflow-hidden group cursor-pointer"
              onClick={() => setPlaying(video)}
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-ink-200 overflow-hidden">
                <img
                  src={thumb}
                  alt={video.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-900/60 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity">
                  <PlayCircle className="w-12 h-12 text-white drop-shadow-lg" />
                </div>
                {isWatched && (
                  <div className="absolute top-2 right-2">
                    <span className="badge bg-accent-500 text-white">
                      <CheckCircle2 className="w-3 h-3" /> Watched
                    </span>
                  </div>
                )}
                <div className="absolute bottom-2 left-2">
                  <span className={`badge ${cat.bg} ${cat.color}`}>
                    {cat.label}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="p-4">
                <h3 className="font-display font-bold text-sm text-ink-900 group-hover:text-primary-700 transition-colors line-clamp-2 leading-snug">
                  {video.title}
                </h3>
                <p className="text-xs text-ink-500 mt-1.5 line-clamp-2 leading-relaxed">
                  {video.description}
                </p>
                <div className="flex items-center gap-3 mt-3 text-xs text-ink-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {video.duration_min} min
                  </span>
                  <span className="flex items-center gap-1">
                    <Youtube className="w-3 h-3" /> Video
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="card p-12 text-center">
          <BookOpen className="w-10 h-10 text-ink-300 mx-auto mb-3" />
          <p className="text-ink-500">No videos match your search.</p>
        </div>
      )}

      {/* Video player modal */}
      {playing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setPlaying(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-ink-100">
              <h3 className="font-display font-bold text-sm text-ink-900 flex-1 pr-4">{playing.title}</h3>
              <button
                onClick={() => setPlaying(null)}
                className="w-8 h-8 rounded-lg hover:bg-ink-100 flex items-center justify-center text-ink-500"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
            <div className="aspect-video bg-ink-900">
              <iframe
                src={`https://www.youtube.com/embed/${playing.youtube_id}?autoplay=1&rel=0`}
                title={playing.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`badge ${CATEGORY_META[playing.category].bg} ${CATEGORY_META[playing.category].color}`}>
                  {CATEGORY_META[playing.category].label}
                </span>
                <span className="flex items-center gap-1 text-xs text-ink-400">
                  <Clock className="w-3 h-3" /> {playing.duration_min} min
                </span>
              </div>
              <p className="text-sm text-ink-600 leading-relaxed">{playing.description}</p>
              {user && !watched.has(playing.id) && (
                <button
                  onClick={() => handleMarkWatched(playing.id)}
                  className="btn-primary mt-4 text-sm"
                >
                  <CheckCircle2 className="w-4 h-4" /> Mark as Watched
                </button>
              )}
              {user && watched.has(playing.id) && (
                <div className="mt-4 flex items-center gap-2 text-sm text-accent-600 font-medium">
                  <CheckCircle2 className="w-4 h-4" /> You've watched this video
                </div>
              )}
              {!user && (
                <p className="mt-4 text-xs text-ink-400">
                  Sign in to track your learning progress.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
