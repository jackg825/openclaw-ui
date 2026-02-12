import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { A2UISurface } from './A2UISurface';
import { useSurfaceStore } from '@/stores/surface';
import { useDataModelStore } from '@/stores/datamodel';

beforeEach(() => {
  useSurfaceStore.setState({ surfaces: new Map() });
  useDataModelStore.setState({ models: new Map() });
});

describe('A2UISurface', () => {
  it('renders nothing for an empty surface', () => {
    useSurfaceStore.getState().createSurface('s1');

    const { container } = render(<A2UISurface surfaceId="s1" />);
    // rootId is null, should render nothing
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing for a non-existent surface', () => {
    const { container } = render(<A2UISurface surfaceId="nonexistent" />);
    expect(container.innerHTML).toBe('');
  });

  it('renders a simple Text component', () => {
    useSurfaceStore.getState().createSurface('s1');
    useSurfaceStore.getState().updateSurface('s1', [
      {
        id: 'text1',
        type: 'Text',
        props: { content: 'Hello World' },
      },
    ]);

    render(<A2UISurface surfaceId="s1" />);
    expect(screen.getByText('Hello World')).toBeDefined();
  });

  it('renders nested components (Card > Row > Text)', () => {
    useSurfaceStore.getState().createSurface('s1');
    useSurfaceStore.getState().updateSurface('s1', [
      {
        id: 'card1',
        type: 'Card',
        props: { title: 'My Card' },
        children: ['row1'],
      },
      {
        id: 'row1',
        type: 'Row',
        parentId: 'card1',
        props: {},
        children: ['text1', 'text2'],
      },
      {
        id: 'text1',
        type: 'Text',
        parentId: 'row1',
        props: { content: 'First' },
      },
      {
        id: 'text2',
        type: 'Text',
        parentId: 'row1',
        props: { content: 'Second' },
      },
    ]);

    render(<A2UISurface surfaceId="s1" />);
    expect(screen.getByText('My Card')).toBeDefined();
    expect(screen.getByText('First')).toBeDefined();
    expect(screen.getByText('Second')).toBeDefined();
  });

  it('renders FallbackWidget for unknown component types', () => {
    useSurfaceStore.getState().createSurface('s1');
    useSurfaceStore.getState().updateSurface('s1', [
      {
        id: 'unknown1',
        type: 'SuperWidget',
        props: {},
      },
    ]);

    render(<A2UISurface surfaceId="s1" />);
    expect(screen.getByText('Unknown component: SuperWidget')).toBeDefined();
  });
});
