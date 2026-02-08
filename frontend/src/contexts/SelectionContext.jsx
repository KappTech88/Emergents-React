import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

/**
 * SelectionContext - Manages selection and hover state for 3D objects
 *
 * Features:
 * - Track selected object
 * - Track hovered object
 * - Selection history
 * - Multi-select support (optional)
 */

const SelectionContext = createContext({
  selectedObject: null,
  hoveredObject: null,
  selectionHistory: [],
  select: () => {},
  deselect: () => {},
  hover: () => {},
  unhover: () => {},
  isSelected: () => false,
  isHovered: () => false,
  clearSelection: () => {}
});

export const SelectionProvider = ({ children, multiSelect = false }) => {
  const [selectedObject, setSelectedObject] = useState(null);
  const [selectedObjects, setSelectedObjects] = useState([]);
  const [hoveredObject, setHoveredObject] = useState(null);
  const [selectionHistory, setSelectionHistory] = useState([]);

  const select = useCallback((objectId, metadata = {}) => {
    const selectionData = { id: objectId, ...metadata, timestamp: Date.now() };

    if (multiSelect) {
      setSelectedObjects(prev => {
        const exists = prev.find(obj => obj.id === objectId);
        if (exists) {
          return prev.filter(obj => obj.id !== objectId);
        }
        return [...prev, selectionData];
      });
    } else {
      setSelectedObject(selectionData);
    }

    setSelectionHistory(prev => [...prev.slice(-19), objectId]);
  }, [multiSelect]);

  const deselect = useCallback((objectId) => {
    if (multiSelect && objectId) {
      setSelectedObjects(prev => prev.filter(obj => obj.id !== objectId));
    } else {
      setSelectedObject(null);
      if (multiSelect) {
        setSelectedObjects([]);
      }
    }
  }, [multiSelect]);

  const clearSelection = useCallback(() => {
    setSelectedObject(null);
    setSelectedObjects([]);
  }, []);

  const hover = useCallback((objectId, metadata = {}) => {
    setHoveredObject({
      id: objectId,
      ...metadata,
      timestamp: Date.now()
    });
  }, []);

  const unhover = useCallback(() => {
    setHoveredObject(null);
  }, []);

  const isSelected = useCallback((objectId) => {
    if (multiSelect) {
      return selectedObjects.some(obj => obj.id === objectId);
    }
    return selectedObject?.id === objectId;
  }, [multiSelect, selectedObject, selectedObjects]);

  const isHovered = useCallback((objectId) => {
    return hoveredObject?.id === objectId;
  }, [hoveredObject]);

  const value = useMemo(() => ({
    selectedObject: multiSelect ? selectedObjects : selectedObject,
    hoveredObject,
    selectionHistory,
    select,
    deselect,
    hover,
    unhover,
    isSelected,
    isHovered,
    clearSelection,
    multiSelect
  }), [
    multiSelect,
    selectedObject,
    selectedObjects,
    hoveredObject,
    selectionHistory,
    select,
    deselect,
    hover,
    unhover,
    isSelected,
    isHovered,
    clearSelection
  ]);

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
};

export const useSelection = () => {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error('useSelection must be used within a SelectionProvider');
  }
  return context;
};

export default SelectionContext;
