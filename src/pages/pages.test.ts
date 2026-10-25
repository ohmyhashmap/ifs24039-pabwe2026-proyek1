import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Berita from './Berita.svelte';
import BeritaDetail from './BeritaDetail.svelte';
import Home from './Home.svelte';
import Lapor from './Lapor.svelte';
import Peta from './Peta.svelte';
import Statistik from './Statistik.svelte';

vi.mock('chart.js/auto', () => ({
	default: vi.fn()
}));

const news = (id: number, overrides: Record<string, unknown> = {}) => ({
	id,
	slug: `news-${id}`,
	title: `Berita ${id}`,
	category: 'Karhutla',
	author: 'Redaksi',
	date: '2026-01-15T12:00:00.000Z',
	image: 'https://images.unsplash.com/photo-example',
	excerpt: `Ringkasan ${id}`,
	content: `Isi ${id}`,
	isExternal: false,
	link: `https://example.com/${id}`,
	...overrides
});

const report = (id: number, severity: string, createdAt: string) => ({
	id,
	severity,
	created_at: createdAt,
	description: `Laporan ${id}`,
	lat: 3.5952,
	lon: 98.6722
});

function response(data: unknown, success = true, error?: string) {
	return new Response(JSON.stringify({ success, data, error }), {
		headers: { 'Content-Type': 'application/json' }
	});
}

const originalWindowFetch = window.fetch;

function setGeolocation(
	result: 'success' | 'error' | 'missing',
	coords = { latitude: 3.5, longitude: 98.6 }
) {
	if (result === 'missing') {
		Object.defineProperty(navigator, 'geolocation', {
			configurable: true,
			value: undefined
		});
		return;
	}

	Object.defineProperty(navigator, 'geolocation', {
		configurable: true,
		value: {
			getCurrentPosition: (onSuccess: (position: unknown) => void, onError: () => void) => {
				if (result === 'success') onSuccess({ coords });
				else onError();
			}
		}
	});
}

beforeEach(() => {
	localStorage.clear();
	window.history.replaceState({}, '', '/');
	vi.stubGlobal('alert', vi.fn());
	const fetchMock = vi.fn(async () => response([]));
	vi.stubGlobal('fetch', fetchMock);
	Object.defineProperty(window, 'fetch', { configurable: true, value: fetchMock });
	setGeolocation('missing');
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	Object.defineProperty(window, 'fetch', { configurable: true, value: originalWindowFetch });
	Object.defineProperty(navigator, 'geolocation', {
		configurable: true,
		value: undefined
	});
	window.history.replaceState({}, '', '/');
});

describe('Berita page', () => {
	it('renders internal and external headlines and their article links', async () => {
		const internal = [news(1), news(2), news(3), news(4), news(5), news(6, { isExternal: true })];
		const external = [
			news(7, { isExternal: true }),
			news(8, { isExternal: false }),
			news(9, { isExternal: true })
		];
		vi.mocked(fetch).mockImplementation(async (input) =>
			response(String(input).endsWith('/external') ? external : internal)
		);

		render(Berita);
		expect(await screen.findByRole('heading', { name: 'Berita 1' })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /Berita 2/ })).toHaveAttribute(
			'href',
			'/berita/news-2'
		);
		await fireEvent.click(screen.getByRole('button', { name: /Kabar Nasional/ }));
		expect(await screen.findByRole('heading', { name: 'Berita 7' })).toBeInTheDocument();
		expect(screen.getByText(/Buka di Tab Baru/)).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /Berita 7/ })).toHaveAttribute('target', '_blank');
		expect(screen.getByRole('link', { name: /Berita 8/ })).toHaveAttribute(
			'href',
			'/berita/news-8'
		);
		await fireEvent.click(screen.getByRole('button', { name: /Berita SigapAsap/ }));
		expect(screen.getByRole('heading', { name: 'Berita 1' })).toBeInTheDocument();
	});

	it('shows empty content and external-source errors for unsuccessful responses', async () => {
		vi.mocked(fetch).mockImplementation(async () => response([], false));
		render(Berita);
		expect(
			await screen.findByText('Belum ada berita untuk ditampilkan saat ini.')
		).toBeInTheDocument();
		await fireEvent.click(screen.getByRole('button', { name: /Kabar Nasional/ }));
		expect(await screen.findByText('Gagal Memuat Berita Eksternal')).toBeInTheDocument();
	});

	it('handles internal and external request failures', async () => {
		const log = vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.mocked(fetch).mockRejectedValue(new Error('offline'));
		render(Berita);
		await fireEvent.click(await screen.findByRole('button', { name: /Kabar Nasional/ }));
		expect(screen.getByText('Gagal Memuat Berita Eksternal')).toBeInTheDocument();
		expect(log).toHaveBeenCalledTimes(2);
	});

	it('shows a lone headline without any side stories', async () => {
		vi.mocked(fetch).mockImplementation(async (input) =>
			response(String(input).endsWith('/external') ? [] : [news(1)])
		);
		render(Berita);
		expect(await screen.findByRole('heading', { name: 'Berita 1' })).toBeInTheDocument();
		expect(screen.queryByRole('link', { name: /Berita 2/ })).not.toBeInTheDocument();
	});
});

describe('Berita detail page', () => {
	it('renders a loaded article, its image, related articles, and category filter link', async () => {
		window.history.replaceState({}, '', '/berita/news-1');
		vi.mocked(fetch).mockImplementation(async (input) =>
			String(input).endsWith('/news') ? response([news(1), news(2)]) : response(news(1))
		);
		render(BeritaDetail, { intro: true });
		expect(await screen.findByRole('heading', { name: 'Berita 1' })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Karhutla' })).toHaveAttribute(
			'href',
			'/berita?category=karhutla'
		);
		expect(screen.getByRole('link', { name: /Berita 2/ })).toBeInTheDocument();
	});

	it('shows the server error or fallback when the article is unavailable', async () => {
		vi.mocked(fetch).mockImplementation(async (input) =>
			String(input).endsWith('/news') ? response([], false) : response(null, false, '')
		);
		render(BeritaDetail);
		expect(
			await screen.findByRole('heading', { name: /Ups, Artikel tidak ditemukan/ })
		).toBeInTheDocument();
	});

	it('handles connection failures', async () => {
		vi.mocked(fetch).mockRejectedValue(new Error('offline'));
		render(BeritaDetail);
		expect(
			await screen.findByRole('heading', { name: /Ups, Gagal terhubung ke server API/ })
		).toBeInTheDocument();
	});

	it('renders an article with no image and no related articles', async () => {
		window.history.replaceState({}, '', '/berita/news-9');
		const article = news(9, { image: '' });
		vi.mocked(fetch).mockImplementation(async (input) =>
			String(input).endsWith('/news') ? response([article]) : response(article)
		);
		render(BeritaDetail);
		expect((await screen.findAllByRole('heading', { name: 'Berita 9' })).length).toBeGreaterThan(0);
		expect(screen.queryByRole('img')).not.toBeInTheDocument();
		expect(screen.queryByText('Berita Terkait')).not.toBeInTheDocument();
	});

	it('renders no article content when the API succeeds without an article', async () => {
		window.history.replaceState({}, '', '/berita/missing');
		vi.mocked(fetch).mockImplementation(async (input) =>
			String(input).endsWith('/news') ? response([]) : response(null)
		);
		render(BeritaDetail);
		await waitFor(() => expect(screen.queryByText('Memuat artikel...')).not.toBeInTheDocument());
		expect(screen.queryByRole('heading')).not.toBeInTheDocument();
	});

	it('renders an untitled article together with its image caption', async () => {
		window.history.replaceState({}, '', '/berita/news-9');
		const article = news(9, { title: null });
		vi.mocked(fetch).mockImplementation(async (input) =>
			String(input).endsWith('/news') ? response([article]) : response(article)
		);
		render(BeritaDetail);
		expect(await screen.findByText(/Ilustrasi:/)).toBeInTheDocument();
	});
});

describe('Home page', () => {
	it('loads the latest news, animates statistics, and builds responsive image sources', async () => {
		const callbacks: FrameRequestCallback[] = [];
		vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
			callbacks.push(callback);
			return callbacks.length;
		});
		vi.stubGlobal('performance', { now: () => 0 });
		const latest = [
			news(1),
			news(2, { image: 'https://other.example/image.jpg' }),
			news(3, { image: 'not a url' }),
			news(4)
		];
		vi.mocked(fetch).mockImplementation(async (input) =>
			String(input).endsWith('/stats') ? response({ totalHotspots: 125 }) : response(latest)
		);

		render(Home, { intro: true });
		expect(await screen.findByRole('link', { name: /Berita 1/ })).toBeInTheDocument();
		expect(screen.getByRole('img', { name: 'Berita 1' })).toHaveAttribute(
			'srcset',
			expect.stringContaining('320w')
		);
		expect(screen.getByRole('img', { name: 'Berita 2' })).not.toHaveAttribute('srcset');
		expect(screen.getByRole('img', { name: 'Berita 3' })).not.toHaveAttribute('srcset');
		callbacks.shift()?.(2500);
		await waitFor(() => expect(screen.getByText('125+')).toBeInTheDocument());
	});

	it('handles unsuccessful responses and uses zero values', async () => {
		vi.mocked(fetch).mockImplementation(async () => response({ totalHotspots: 0 }, false));
		render(Home);
		expect(await screen.findByRole('link', { name: /Lihat Semua/ })).toBeInTheDocument();
		expect(screen.queryByRole('img', { name: 'Berita 1' })).not.toBeInTheDocument();
	});

	it('continues rendering when the homepage API fails', async () => {
		const log = vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.mocked(fetch).mockRejectedValue(new Error('offline'));
		render(Home);
		expect(await screen.findByRole('heading', { name: 'Berita & Informasi' })).toBeInTheDocument();
		expect(log).toHaveBeenCalled();
	});
});

describe('Lapor page', () => {
	it('loads reports, resolves GPS, selects severity, and submits a report', async () => {
		setGeolocation('success');
		const reports = [
			report(1, 'tinggi', new Date(Date.now() - 10 * 60_000).toISOString()),
			report(2, 'sedang', new Date(Date.now() - 90 * 60_000).toISOString()),
			report(3, 'rendah', new Date(Date.now() - 3 * 60_000).toISOString())
		];
		vi.mocked(fetch).mockImplementation(async (input, init) =>
			init?.method === 'POST' ? response({}) : response(reports)
		);
		render(Lapor, { intro: true });
		expect(await screen.findByText('Prioritas Tinggi')).toBeInTheDocument();
		expect(screen.getByText('Waspada')).toBeInTheDocument();
		expect(screen.getByText('Pantauan')).toBeInTheDocument();
		expect(screen.getByText('GPS AKTIF')).toBeInTheDocument();
		expect(screen.getByText(/jam lalu/)).toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'Rendah' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Sedang' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Tinggi' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Rendah' }));
		await fireEvent.input(screen.getByLabelText('Apa yang Anda lihat?'), {
			target: { value: 'Asap di perkebunan' }
		});
		await fireEvent.click(screen.getByRole('button', { name: 'Kirim Laporan Warga' }));
		await waitFor(() =>
			expect(fetch).toHaveBeenCalledWith(
				'/api/v1/reports',
				expect.objectContaining({ method: 'POST' })
			)
		);
	});

	it('uses the fallback location and displays an empty feed on request failure', async () => {
		setGeolocation('error');
		vi.mocked(fetch).mockRejectedValue(new Error('offline'));
		const log = vi.spyOn(console, 'error').mockImplementation(() => {});
		render(Lapor);
		expect(await screen.findByText('Belum ada laporan masuk.')).toBeInTheDocument();
		expect(screen.getByText('3.59520, 98.67220')).toBeInTheDocument();
		expect(log).toHaveBeenCalled();
	});

	it('submits with missing GPS fallback and alerts when submission fails', async () => {
		setGeolocation('missing');
		vi.mocked(fetch).mockImplementation(async (_input, init) =>
			init?.method === 'POST' ? Promise.reject(new Error('offline')) : response([])
		);
		render(Lapor);
		await fireEvent.input(await screen.findByLabelText('Apa yang Anda lihat?'), {
			target: { value: 'Asap' }
		});
		await fireEvent.click(screen.getByRole('button', { name: 'Kirim Laporan Warga' }));
		await waitFor(() => expect(alert).toHaveBeenCalledWith('Gagal mengirim laporan'));
	});

	it('ignores an unsuccessful feed response and an empty submission', async () => {
		setGeolocation('success');
		vi.mocked(fetch).mockImplementation(async () => response([], false));
		render(Lapor);
		expect(await screen.findByText('Belum ada laporan masuk.')).toBeInTheDocument();

		const submit = screen.getByRole('button', { name: 'Kirim Laporan Warga' });
		expect(submit).toBeDisabled();
		submit.removeAttribute('disabled');
		await fireEvent.click(submit);
		expect(fetch).not.toHaveBeenCalledWith(
			'/api/v1/reports',
			expect.objectContaining({ method: 'POST' })
		);
	});

	it('adds a report that arrives after a submission to the feed', async () => {
		setGeolocation('success');
		let submitted = false;
		vi.mocked(fetch).mockImplementation(async (_input, init) => {
			if (init?.method === 'POST') {
				submitted = true;
				return response({});
			}
			const first = report(1, 'tinggi', new Date().toISOString());
			return response(submitted ? [first, report(2, 'rendah', new Date().toISOString())] : [first]);
		});
		render(Lapor);
		expect(await screen.findByText('Laporan 1')).toBeInTheDocument();
		expect(screen.queryByText('Laporan 2')).not.toBeInTheDocument();

		await fireEvent.input(screen.getByLabelText('Apa yang Anda lihat?'), {
			target: { value: 'Asap baru' }
		});
		await fireEvent.click(screen.getByRole('button', { name: 'Kirim Laporan Warga' }));
		expect(await screen.findByText('Laporan 2')).toBeInTheDocument();
		expect(screen.getAllByRole('link', { name: /Cek Peta/ })[1]).toHaveAttribute(
			'href',
			'/peta?lat=3.5952&lon=98.6722'
		);
	});
});

describe('Statistik page', () => {
	it('loads local statistics and creates both charts', async () => {
		setGeolocation('success', { latitude: 3.6, longitude: 98.7 });
		const stats = {
			totalHotspots: 25,
			isLocal: true,
			topProvinces: [{ name: 'Sumatera Utara', count: 5 }],
			aqiDistribution: [1, 2, 3, 4]
		};
		vi.mocked(fetch).mockResolvedValue(response(stats) as never);
		const chart = await import('chart.js/auto');
		render(Statistik);
		expect(await screen.findByText(/Radius ±330 km/)).toBeInTheDocument();
		expect(screen.getByText(/25 Titik/)).toBeInTheDocument();
		await waitFor(() => expect(chart.default).toHaveBeenCalledTimes(2));
	});

	it('uses national data when GPS is unavailable and API returns no success', async () => {
		setGeolocation('error');
		vi.mocked(fetch).mockResolvedValue(response(null, false, '') as never);
		render(Statistik);
		expect(await screen.findByText('Gagal memuat data.')).toBeInTheDocument();
		expect(screen.queryByText(/Radius ±330 km/)).not.toBeInTheDocument();
	});

	it('uses national data when the browser has no geolocation API', async () => {
		setGeolocation('missing');
		vi.mocked(fetch).mockResolvedValue(
			response({
				totalHotspots: 0,
				isLocal: false,
				topProvinces: [],
				aqiDistribution: []
			}) as never
		);
		render(Statistik);
		expect(await screen.findByText('Seluruh Indonesia (GPS Tidak Aktif)')).toBeInTheDocument();
	});

	it('displays a connection error when statistics cannot be loaded', async () => {
		vi.mocked(fetch).mockRejectedValue(new Error('offline'));
		render(Statistik);
		expect(await screen.findByText('Gagal terhubung ke server.')).toBeInTheDocument();
	});

	it('draws national chart titles when the statistics are not local', async () => {
		setGeolocation('missing');
		vi.mocked(fetch).mockResolvedValue(
			response({
				totalHotspots: 640,
				isLocal: false,
				topProvinces: [{ name: 'Riau', count: 7 }],
				aqiDistribution: [4, 3, 2, 1]
			}) as never
		);
		const chart = await import('chart.js/auto');
		vi.mocked(chart.default).mockClear();
		render(Statistik);
		expect(await screen.findByText('640 Titik')).toBeInTheDocument();
		await waitFor(() => expect(chart.default).toHaveBeenCalledTimes(2));
		type ChartCall = [unknown, { options: { plugins: { title: { text: string } } } }];
		const titles = (vi.mocked(chart.default).mock.calls as unknown as ChartCall[]).map(
			([, config]) => config.options.plugins.title.text
		);
		expect(titles).toEqual(['Top 10 Provinsi Nasional', 'Distribusi Kualitas Udara Nasional']);
	});
});

describe('Peta page', () => {
	it('initializes the map and opens the information panel', async () => {
		vi.mocked(fetch).mockResolvedValue(response([]) as never);
		render(Peta);
		const maplibre = (await import('maplibre-gl')) as typeof import('maplibre-gl') & {
			__mapState: { instances: unknown[] };
		};
		await waitFor(() =>
			expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/hotspots'))
		);
		expect(maplibre.__mapState.instances.length).toBeGreaterThan(0);
		await fireEvent.click(await screen.findByRole('button', { name: 'Buka Info' }));
		expect(screen.getByText('N/A')).toBeInTheDocument();
	});

	it('renders hotspot data and exercises map, timelapse, health, and trajectory controls', async () => {
		const hotspots = [
			{
				lat: 3.5,
				lon: 98.6,
				confidence: 60,
				detected_at: '2025-01-01T00:00:00.000Z'
			},
			{
				lat: 3.6,
				lon: 98.7,
				confidence: 85,
				detected_at: '2025-01-01T12:00:00.000Z'
			}
		];
		vi.mocked(fetch).mockImplementation(async (input) => {
			const url = String(input);
			if (url.includes('/hotspots')) return response(hotspots);
			if (url.includes('/environment'))
				return response({
					aqi: { aqi: 70, station: 'Medan' },
					weather: { wind_speed: 12 }
				});
			if (url.includes('/safe-window')) return response({ start: '08.00', end: '10.00' });
			if (url.includes('/recommendations')) return response({ message: 'Gunakan masker.' });
			if (url.includes('/trajectory'))
				return response({
					geojson: { type: 'FeatureCollection', features: [] }
				});
			return response([]);
		});

		render(Peta);
		await waitFor(() =>
			expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/hotspots'))
		);
		const maplibre = (await import('maplibre-gl')) as typeof import('maplibre-gl') & {
			__mapState: { instances: Array<Record<string, any>> };
		};
		const map = maplibre.__mapState.instances.at(-1)!;
		await waitFor(() => expect(map.getLayer('hotspots-layer')).toBeDefined());
		await fireEvent.click(screen.getByRole('button', { name: 'Buka Info' }));
		expect(await screen.findByText('Sedang')).toBeInTheDocument();
		expect(screen.getByText('Medan')).toBeInTheDocument();
		expect(screen.getByText('12')).toBeInTheDocument();
		expect(screen.getByText('08.00 - 10.00')).toBeInTheDocument();
		expect(await screen.findByText('Gunakan masker.')).toBeInTheDocument();
		expect(screen.getByText('1')).toBeInTheDocument();

		map.trigger('click', 'hotspots-layer', {
			features: [
				{
					properties: { confidence: 85, detected_at: hotspots[1].detected_at },
					geometry: { coordinates: [98.7, 3.6] }
				}
			]
		});
		map.trigger('click', 'hotspots-layer', { features: [] });

		const timeline = screen.getByRole('slider');
		await fireEvent.input(timeline, { target: { value: '0' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Putar timelapse titik panas' }));
		expect(screen.getByRole('button', { name: 'Jeda timelapse titik panas' })).toBeInTheDocument();
		await fireEvent.click(screen.getByRole('button', { name: 'Jeda timelapse titik panas' }));

		await fireEvent.change(screen.getByRole('combobox'), {
			target: { value: 'asma' }
		});
		expect(await screen.findByText('Gunakan masker.')).toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'Tampilkan kontrol peta' }));
		await fireEvent.click(screen.getByRole('button', { name: /Sembunyikan Titik/ }));
		await fireEvent.click(screen.getByRole('button', { name: /Tampilkan Titik/ }));
		await fireEvent.click(screen.getByRole('button', { name: /Lintasan Asap/ }));
		expect(await screen.findByRole('button', { name: /Matikan Lintasan/ })).toBeInTheDocument();
		expect(map.getLayer('trajectory-line')).toBeDefined();
		await fireEvent.click(screen.getByRole('button', { name: /Matikan Lintasan/ }));
		expect(map.getLayer('trajectory-line')).toBeUndefined();

		await fireEvent.click(screen.getByRole('button', { name: 'Tampilkan lokasi saya' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Tampilkan peta nasional' }));
	});

	it('handles hotspot, environment, recommendation, and trajectory failures', async () => {
		const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.mocked(fetch).mockImplementation(async (input) => {
			if (String(input).includes('/hotspots')) throw new Error('offline');
			return response(null, false);
		});
		render(Peta);
		await waitFor(() =>
			expect(errorLog).toHaveBeenCalledWith('Gagal memuat hotspot:', expect.any(Error))
		);
		await fireEvent.click(screen.getByRole('button', { name: 'Buka Info' }));
		expect(screen.getByText('N/A')).toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'Tampilkan kontrol peta' }));
		vi.mocked(fetch).mockImplementation(async (input) =>
			String(input).includes('/trajectory')
				? Promise.reject(new Error('offline'))
				: response(null, false)
		);
		await fireEvent.click(screen.getByRole('button', { name: /Lintasan Asap/ }));
		await waitFor(() => expect(alert).toHaveBeenCalledWith('Gagal memuat prediksi lintasan.'));
	});

	it('uses device location, advances the timeline, and submits map reports', async () => {
		setGeolocation('success', { latitude: 4.2, longitude: 99.1 });
		const hotspots = [
			{ lat: 4.2, lon: 99.1, confidence: 85, detected_at: '2025-02-01T00:00:00.000Z' },
			{ lat: 4.3, lon: 99.2, confidence: 35, detected_at: '2025-02-01T12:00:00.000Z' }
		];
		vi.mocked(fetch).mockImplementation(async (input, init) => {
			const url = String(input);
			if (init?.method === 'POST') return response({});
			if (url.includes('/hotspots')) return response(hotspots);
			if (url.includes('/environment'))
				return response({
					aqi: { aqi: 225, station: '' },
					weather: { wind_speed: 4 }
				});
			if (url.includes('/recommendations')) throw new Error('offline');
			return response({ start: '06.00', end: '08.00' });
		});
		render(Peta);
		await waitFor(() =>
			expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/hotspots'))
		);
		const maplibre = (await import('maplibre-gl')) as typeof import('maplibre-gl') & {
			__mapState: { instances: Array<Record<string, any>> };
		};
		const map = maplibre.__mapState.instances.at(-1)!;
		await waitFor(() => expect(map.getLayer('hotspots-layer')).toBeDefined());
		await fireEvent.click(screen.getByRole('button', { name: 'Buka Info' }));
		expect(await screen.findByText('Sangat Buruk')).toBeInTheDocument();
		expect(screen.getByText('Lokasi Anda')).toBeInTheDocument();
		await waitFor(() => expect(screen.getByText('Gagal memuat rekomendasi.')).toBeInTheDocument());

		vi.useFakeTimers();
		await fireEvent.input(screen.getByRole('slider'), { target: { value: '0' } });
		await vi.advanceTimersByTimeAsync(50);
		expect(map.getSource('hotspots-source').setData).toHaveBeenCalled();
		await fireEvent.click(screen.getByRole('button', { name: 'Putar timelapse titik panas' }));
		const slider = screen.getByRole('slider') as HTMLInputElement;
		await vi.advanceTimersByTimeAsync(850);
		await tick();
		expect(slider.value).toBe('1');
		await vi.advanceTimersByTimeAsync(800);
		await tick();
		expect(slider.value).toBe('2');
		await vi.advanceTimersByTimeAsync(800);
		await tick();
		expect(slider.value).toBe('0');
		await fireEvent.click(screen.getByRole('button', { name: 'Jeda timelapse titik panas' }));

		await fireEvent.click(screen.getByRole('button', { name: 'Tampilkan peta nasional' }));
		expect(map.flyTo).toHaveBeenCalledWith({
			center: [117, -2],
			zoom: 4,
			duration: 2000
		});
		await fireEvent.click(screen.getByRole('button', { name: 'Tampilkan lokasi saya' }));
		expect(map.flyTo).toHaveBeenCalledWith({
			center: [99.1, 4.2],
			zoom: 9,
			duration: 2000
		});
		await fireEvent.click(screen.getByRole('button', { name: 'Tampilkan kontrol peta' }));
		await fireEvent.click(screen.getByRole('button', { name: /Lapor di Peta/ }));
		await fireEvent.input(screen.getByPlaceholderText(/Terlihat asap tebal/), {
			target: { value: 'Asap dekat permukiman' }
		});
		await fireEvent.click(screen.getByRole('button', { name: 'Kirim Laporan' }));
		await waitFor(() =>
			expect(alert).toHaveBeenCalledWith('Laporan berhasil dikirim! Terima kasih.')
		);
		expect(fetch).toHaveBeenCalledWith(
			'/api/v1/reports',
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({
					lat: 4.2,
					lon: 99.1,
					description: 'Asap dekat permukiman'
				})
			})
		);
	});

	it('submits a map report using map center and handles submission errors', async () => {
		vi.mocked(fetch).mockImplementation(async (_input, init) =>
			init?.method === 'POST' ? Promise.reject(new Error('offline')) : response([])
		);
		render(Peta);
		await waitFor(() =>
			expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/hotspots'))
		);
		await fireEvent.click(screen.getByRole('button', { name: 'Tampilkan kontrol peta' }));
		await fireEvent.click(screen.getByRole('button', { name: /Lapor di Peta/ }));
		const submitButton = screen.getByRole('button', { name: 'Kirim Laporan' });
		submitButton.removeAttribute('disabled');
		await fireEvent.click(submitButton);
		await fireEvent.input(screen.getByPlaceholderText(/Terlihat asap tebal/), {
			target: { value: 'Asap di lahan' }
		});
		await fireEvent.click(submitButton);
		await waitFor(() => expect(alert).toHaveBeenCalledWith('Gagal mengirim laporan.'));
		expect(fetch).toHaveBeenCalledWith(
			'/api/v1/reports',
			expect.objectContaining({
				body: JSON.stringify({
					lat: 3,
					lon: 98,
					description: 'Asap di lahan'
				})
			})
		);
		await fireEvent.click(screen.getByRole('button', { name: 'Batal' }));
		expect(screen.queryByText(/Laporan Anda akan dipetakan/)).not.toBeInTheDocument();
	});

	it('uses the default coordinates when location permission is denied', async () => {
		setGeolocation('error');
		vi.mocked(fetch).mockImplementation(async (input) =>
			String(input).includes('/environment')
				? response({
						aqi: { aqi: 150, station: 'Medan' },
						weather: { wind_speed: 8 }
					})
				: response({ start: '07.00', end: '09.00' })
		);
		render(Peta);
		await waitFor(() =>
			expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/hotspots'))
		);
		await fireEvent.click(screen.getByRole('button', { name: 'Buka Info' }));
		expect(await screen.findByText('Tidak Sehat')).toBeInTheDocument();
		expect(screen.getByText('Medan')).toBeInTheDocument();
	});

	it('catches a map initialization failure', async () => {
		const maplibre = (await import('maplibre-gl')) as typeof import('maplibre-gl') & {
			__mapState: { instances: Array<Record<string, any>>; failInitialization: boolean };
			setWorkerUrl: ReturnType<typeof vi.fn>;
		};
		maplibre.__mapState.failInitialization = true;
		const previousCount = maplibre.__mapState.instances.length;
		render(Peta);
		await waitFor(() => expect(maplibre.setWorkerUrl).toHaveBeenCalled());
		expect(maplibre.__mapState.instances).toHaveLength(previousCount);
		maplibre.__mapState.failInitialization = false;
	});

	it('highlights health guidance from the health action and refreshes the displayed time', async () => {
		window.history.replaceState({}, '', '/?action=health');
		vi.mocked(fetch).mockResolvedValue(response([]) as never);
		render(Peta);
		await waitFor(() =>
			expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/hotspots'))
		);
		await fireEvent.click(screen.getByRole('button', { name: 'Buka Info' }));
		await new Promise((resolve) => setTimeout(resolve, 1100));
		const healthLabel = screen.getByText(/Saran Kesehatan:/);
		expect(healthLabel.parentElement).toHaveClass('ring-blue-500');
		await new Promise((resolve) => setTimeout(resolve, 3100));
		expect(healthLabel.parentElement).not.toHaveClass('ring-blue-500');
	});

	describe('edge cases', () => {
		type MapInstance = {
			addLayer(layer: { id: string }): void;
			addSource(id: string, source: unknown): void;
			removeLayer(id: string): void;
			removeSource(id: string): void;
			setLayoutProperty: ReturnType<typeof vi.fn>;
		};
		type MapLibreMock = typeof import('maplibre-gl') & {
			__mapState: { instances: MapInstance[]; failInitialization: boolean };
			setWorkerUrl: ReturnType<typeof vi.fn>;
		};
		const loadMapLibre = async () => (await import('maplibre-gl')) as MapLibreMock;
		const at = (hour: number) => new Date(Date.UTC(2025, 0, 1, hour)).toISOString();
		const waitForEnvironment = () =>
			waitFor(() =>
				expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/environment'))
			);

		it('keeps the map controls inert while the map is unavailable', async () => {
			const maplibre = await loadMapLibre();
			const attempts = maplibre.setWorkerUrl.mock.calls.length;
			maplibre.__mapState.failInitialization = true;
			try {
				render(Peta);
				await waitFor(() =>
					expect(maplibre.setWorkerUrl.mock.calls.length).toBeGreaterThan(attempts)
				);

				await fireEvent.click(screen.getByRole('button', { name: 'Tampilkan lokasi saya' }));
				expect(screen.getByRole('button', { name: 'Tampilkan lokasi saya' })).toBeInTheDocument();

				await fireEvent.click(screen.getByRole('button', { name: 'Tampilkan kontrol peta' }));
				await fireEvent.click(screen.getByRole('button', { name: /Sembunyikan Titik/ }));
				expect(screen.getByRole('button', { name: /Sembunyikan Titik/ })).toBeInTheDocument();
				await fireEvent.click(screen.getByRole('button', { name: /Lintasan Asap/ }));
				expect(screen.getByRole('button', { name: /Lintasan Asap/ })).toBeInTheDocument();
				expect(fetch).not.toHaveBeenCalled();
			} finally {
				maplibre.__mapState.failInitialization = false;
			}
		});

		it('toggles hotspot visibility safely when no hotspot layer exists', async () => {
			vi.mocked(fetch).mockImplementation(async () => response(null, false));
			render(Peta);
			const maplibre = await loadMapLibre();
			await waitForEnvironment();
			const map = maplibre.__mapState.instances.at(-1)!;

			await fireEvent.click(screen.getByRole('button', { name: 'Tampilkan kontrol peta' }));
			await fireEvent.click(screen.getByRole('button', { name: /Sembunyikan Titik/ }));
			expect(await screen.findByRole('button', { name: /Tampilkan Titik/ })).toBeInTheDocument();
			expect(map.setLayoutProperty).not.toHaveBeenCalled();
		});

		it('places unsorted hotspots into frames and drops out-of-range ones', async () => {
			const hotspots = [
				{ lat: 3.1, lon: 98.1, confidence: 55, detected_at: at(6) },
				{ lat: 3.2, lon: 98.2, confidence: 90, detected_at: at(0) },
				{ lat: 3.3, lon: 98.3, confidence: 40, detected_at: at(18) },
				{ lat: 3.4, lon: 98.4, confidence: 'abc', detected_at: at(12) },
				{ lat: 3.5, lon: 98.5, confidence: 65, detected_at: at(7) }
			];
			vi.mocked(fetch).mockImplementation(async (input) =>
				String(input).includes('/hotspots') ? response(hotspots) : response(null, false)
			);
			render(Peta);
			await waitForEnvironment();
			await fireEvent.click(screen.getByRole('button', { name: 'Buka Info' }));

			const timeSlider = screen.getByRole('slider');
			expect(timeSlider).toHaveAttribute('max', '1');
			const total = () => screen.getByText('Titik Api').nextElementSibling;
			await waitFor(() => expect(total()).toHaveTextContent('1'));
			await fireEvent.input(timeSlider, { target: { value: '0' } });
			await waitFor(() => expect(total()).toHaveTextContent('2'));
		});

		it('creates no timeline when hotspot timestamps run backwards', async () => {
			const hotspots = [
				{ lat: 3.1, lon: 98.1, confidence: 80, detected_at: at(12) },
				{ lat: 3.2, lon: 98.2, confidence: 80, detected_at: at(0) }
			];
			vi.mocked(fetch).mockImplementation(async (input) =>
				String(input).includes('/hotspots') ? response(hotspots) : response(null, false)
			);
			render(Peta);
			await waitForEnvironment();
			await fireEvent.click(screen.getByRole('button', { name: 'Buka Info' }));
			expect(screen.queryByRole('slider')).not.toBeInTheDocument();
		});

		it('shows the waiting message when recommendations are unsuccessful', async () => {
			vi.mocked(fetch).mockImplementation(async (input) => {
				const url = String(input);
				if (url.includes('/environment')) return response({ aqi: { aqi: 30 }, weather: {} });
				if (url.includes('/safe-window')) return response({});
				return response(null, false);
			});
			render(Peta);
			await waitFor(() =>
				expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/recommendations'))
			);
			await fireEvent.click(screen.getByRole('button', { name: 'Buka Info' }));

			expect(await screen.findByText('Baik')).toBeInTheDocument();
			expect(screen.getByText('Lokasi Anda')).toBeInTheDocument();
			expect(screen.getByText('Waktu Aman')).toBeInTheDocument();
			expect(screen.getByText('km/j')).toBeInTheDocument();
			expect(await screen.findByText('Menunggu data...')).toBeInTheDocument();
		});

		it('replaces stale trajectory layers and targets the strongest hotspot', async () => {
			const stamp = '2025-03-01T00:00:00.000Z';
			const hotspots = [
				{ lat: 1.5, lon: 101.5, confidence: 40, detected_at: stamp },
				{ lat: 1.6, lon: 101.6, confidence: 95, detected_at: stamp },
				{ lat: 1.7, lon: 101.7, confidence: 70, detected_at: stamp }
			];
			vi.mocked(fetch).mockImplementation(async (input) => {
				const url = String(input);
				if (url.includes('/hotspots')) return response(hotspots);
				if (url.includes('/trajectory'))
					return response({ geojson: { type: 'FeatureCollection', features: [] } });
				return response(null, false);
			});
			render(Peta);
			const maplibre = await loadMapLibre();
			await waitForEnvironment();
			const map = maplibre.__mapState.instances.at(-1)!;
			map.addSource('trajectory-source', { type: 'geojson', data: {} });
			map.addLayer({ id: 'trajectory-line' });

			await fireEvent.click(screen.getByRole('button', { name: 'Tampilkan kontrol peta' }));
			await fireEvent.click(screen.getByRole('button', { name: /Lintasan Asap/ }));
			expect(await screen.findByRole('button', { name: /Matikan Lintasan/ })).toBeInTheDocument();
			expect(fetch).toHaveBeenCalledWith('/api/v1/trajectory?lat=1.6&lon=101.6');

			map.removeLayer('trajectory-line');
			map.removeSource('trajectory-source');
			await fireEvent.click(screen.getByRole('button', { name: /Matikan Lintasan/ }));
			expect(await screen.findByRole('button', { name: /Lintasan Asap/ })).toBeInTheDocument();
		});

		it('leaves the trajectory off when the prediction is unsuccessful', async () => {
			let release!: (value: Response) => void;
			vi.mocked(fetch).mockImplementation((input) =>
				String(input).includes('/trajectory')
					? new Promise<Response>((resolve) => (release = resolve))
					: Promise.resolve(response(null, false))
			);
			render(Peta);
			await waitForEnvironment();
			await fireEvent.click(screen.getByRole('button', { name: 'Tampilkan kontrol peta' }));
			await fireEvent.click(screen.getByRole('button', { name: /Lintasan Asap/ }));
			await waitFor(() =>
				expect(screen.getByRole('button', { name: /Lintasan Asap/ })).toBeDisabled()
			);

			release(response(null, false));
			await waitFor(() =>
				expect(screen.getByRole('button', { name: /Lintasan Asap/ })).toBeEnabled()
			);
			expect(alert).not.toHaveBeenCalled();
		});

		it('opens the smoke trajectory automatically from the trajectory action', async () => {
			window.history.replaceState({}, '', '/?action=trajectory');
			vi.mocked(fetch).mockImplementation(async (input) =>
				String(input).includes('/trajectory')
					? response({ geojson: { type: 'FeatureCollection', features: [] } })
					: response([])
			);
			render(Peta);
			await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/v1/trajectory'), {
				timeout: 4000
			});
		});
	});
});
