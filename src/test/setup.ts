import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

vi.mock('svelte/transition', () => ({
	fade: () => ({ duration: 0 }),
	fly: () => ({ duration: 0 })
}));

vi.mock('maplibre-gl', () => {
	const mapState = {
		instances: [] as any[],
		failInitialization: false
	};

	class MapMock {
		private readonly handlers = new Map<string, (event?: any) => void>();
		private readonly sources = new Map<string, any>();
		private readonly layers = new Map<string, any>();

		constructor() {
			mapState.instances.push(this);
		}

		on(
			event: string,
			layerOrHandler: string | ((event?: any) => void),
			handler?: (event?: any) => void
		) {
			this.handlers.set(
				typeof layerOrHandler === 'function' ? event : `${event}:${layerOrHandler}`,
				typeof layerOrHandler === 'function' ? layerOrHandler : handler!
			);
			if (event === 'load') {
				queueMicrotask(() => {
					this.handlers.get('load')?.();
				});
			}
			return this;
		}

		trigger(event: string, layer?: string, payload?: unknown) {
			this.handlers.get(layer ? `${event}:${layer}` : event)?.(payload);
		}

		getSource(id: string) {
			return this.sources.get(id);
		}

		addSource(id: string, source: any) {
			this.sources.set(id, { ...source, setData: vi.fn() });
		}

		removeSource(id: string) {
			this.sources.delete(id);
		}

		addLayer(layer: any) {
			this.layers.set(layer.id, layer);
		}

		getLayer(id: string) {
			return this.layers.get(id);
		}

		removeLayer(id: string) {
			this.layers.delete(id);
		}

		setLayoutProperty = vi.fn();
		setPadding = vi.fn();
		flyTo = vi.fn();
		getCenter() {
			return { lat: 3, lng: 98 };
		}
		remove = vi.fn();
	}

	class PopupMock {
		setLngLat() {
			return this;
		}
		setHTML() {
			return this;
		}
		addTo() {
			return this;
		}
	}

	return {
		Map: MapMock,
		Popup: PopupMock,
		setWorkerUrl: vi.fn(() => {
			if (mapState.failInitialization) throw new Error('map initialization failed');
		}),
		__mapState: mapState
	};
});
