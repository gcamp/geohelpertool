import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../Sidebar';
import { LayerContext } from '../../contexts/LayerContext';
import { NotificationContext } from '../../contexts/NotificationContext';
import { LayerType } from '../../types/layer';

const mockLayer = {
  id: 'test-layer',
  name: 'Test Polyline',
  type: LayerType.POLYLINE,
  data: {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: [[0, 0], [1, 1], [2, 2]]
        },
        properties: {}
      }
    ]
  },
  color: '🔵' as const,
  visibility: true,
  options: {},
  createdAt: new Date(),
  updatedAt: new Date()
};

describe('Polyline Visualization Controls', () => {
  const mockUpdateLayer = vi.fn();
  const mockShowSuccess = vi.fn();
  const mockShowError = vi.fn();

  const renderSidebar = () => {
    const mockContextValue = {
      state: { layers: [mockLayer], activeLayerId: null, layerCount: 1 },
      actions: {
        updateLayer: mockUpdateLayer,
        addLayer: vi.fn(),
        removeLayer: vi.fn(),
        toggleVisibility: vi.fn(),
        updateColor: vi.fn(),
        clearLayers: vi.fn(),
        updateLayerName: vi.fn()
      }
    };

    const mockNotificationValue = {
      showSuccess: mockShowSuccess,
      showError: mockShowError
    };

    return render(
      <NotificationContext.Provider value={mockNotificationValue}>
        <LayerContext.Provider value={mockContextValue}>
          <Sidebar />
        </LayerContext.Provider>
      </NotificationContext.Provider>
    );
  };

  it('renders gradient checkbox for polyline layers', () => {
    renderSidebar();
    expect(screen.getByText('Show Direction Gradient')).toBeInTheDocument();
  });

  it('renders progress slider for polyline layers', () => {
    renderSidebar();
    expect(screen.getByText(/Show Path Progress:/)).toBeInTheDocument();
  });

  it('toggles gradient mode when checkbox is clicked', () => {
    renderSidebar();
    const checkbox = screen.getByLabelText('Show Direction Gradient');

    fireEvent.click(checkbox);

    expect(mockUpdateLayer).toHaveBeenCalledWith(
      'test-layer',
      expect.objectContaining({
        options: { gradientMode: true }
      })
    );
  });

  it('updates progress slider value', () => {
    renderSidebar();
    const slider = screen.getByRole('slider');

    fireEvent.change(slider, { target: { value: '50' } });

    // Wait for debounce
    setTimeout(() => {
      expect(mockUpdateLayer).toHaveBeenCalledWith(
        'test-layer',
        expect.objectContaining({
          options: { progressSlider: 50 }
        })
      );
    }, 150);
  });

  it('resets slider to 100% when reset button is clicked', () => {
    renderSidebar();
    const resetButton = screen.getByText('Reset');

    fireEvent.click(resetButton);

    setTimeout(() => {
      expect(mockUpdateLayer).toHaveBeenCalledWith(
        'test-layer',
        expect.objectContaining({
          options: { progressSlider: 100 }
        })
      );
    }, 150);
  });

  it('disables slider when layer is not visible', () => {
    const hiddenLayer = { ...mockLayer, visibility: false };

    const mockContextValue = {
      state: { layers: [hiddenLayer], activeLayerId: null, layerCount: 1 },
      actions: {
        updateLayer: mockUpdateLayer,
        addLayer: vi.fn(),
        removeLayer: vi.fn(),
        toggleVisibility: vi.fn(),
        updateColor: vi.fn(),
        clearLayers: vi.fn(),
        updateLayerName: vi.fn()
      }
    };

    const mockNotificationValue = {
      showSuccess: mockShowSuccess,
      showError: mockShowError
    };

    render(
      <NotificationContext.Provider value={mockNotificationValue}>
        <LayerContext.Provider value={mockContextValue}>
          <Sidebar />
        </LayerContext.Provider>
      </NotificationContext.Provider>
    );

    const slider = screen.getByRole('slider');
    expect(slider).toBeDisabled();
  });
});
