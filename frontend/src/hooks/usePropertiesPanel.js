import { useState, useCallback, useEffect } from 'react';

export const usePropertiesPanel = (fabricCanvas, selectedObj, selectedObjects, debouncedSave, currentVersionIdRef) => {
  const [rightTab, setRightTab] = useState("props");
  const [layersKey, setLayersKey] = useState(0);

  // Update layers when objects change
  useEffect(() => {
    if (fabricCanvas) {
      setLayersKey(prev => prev + 1);
    }
  }, [fabricCanvas, selectedObj, selectedObjects]);

  // Property update handlers
  const updateProperty = useCallback((property, value) => {
    if (!selectedObj || !fabricCanvas) return;

    selectedObj.set({ [property]: value });
    selectedObj.setCoords();
    fabricCanvas.renderAll();
    
    if (debouncedSave && currentVersionIdRef?.current) {
      debouncedSave(fabricCanvas, currentVersionIdRef.current);
    }
  }, [selectedObj, fabricCanvas, debouncedSave, currentVersionIdRef]);

  const updateMultipleProperties = useCallback((properties) => {
    if (!selectedObj || !fabricCanvas) return;

    Object.entries(properties).forEach(([property, value]) => {
      selectedObj.set({ [property]: value });
    });
    selectedObj.setCoords();
    fabricCanvas.renderAll();
    
    if (debouncedSave && currentVersionIdRef?.current) {
      debouncedSave(fabricCanvas, currentVersionIdRef.current);
    }
  }, [selectedObj, fabricCanvas, debouncedSave, currentVersionIdRef]);

  // Text-specific handlers
  const updateTextProperty = useCallback((property, value) => {
    if (!selectedObj || !fabricCanvas) return;
    
    const textTypes = ['text', 'i-text', 'textbox'];
    if (!textTypes.includes(selectedObj.type)) return;

    updateProperty(property, value);
  }, [selectedObj, fabricCanvas, updateProperty]);

  // Shape-specific handlers
  const updateShapeProperty = useCallback((property, value) => {
    if (!selectedObj || !fabricCanvas) return;
    
    const shapeTypes = ['rect', 'circle', 'ellipse', 'triangle', 'polygon'];
    if (!shapeTypes.includes(selectedObj.type)) return;

    updateProperty(property, value);
  }, [selectedObj, fabricCanvas, updateProperty]);

  // Image-specific handlers
  const updateImageProperty = useCallback((property, value) => {
    if (!selectedObj || !fabricCanvas) return;
    
    if (selectedObj.type !== 'image') return;

    updateProperty(property, value);
  }, [selectedObj, fabricCanvas, updateProperty]);

  // Group handling
  const ungroupObjects = useCallback(() => {
    if (!fabricCanvas || !selectedObj || selectedObj.type !== 'group') return;
    
    const objects = selectedObj.getObjects();
    
    fabricCanvas.remove(selectedObj);
    objects.forEach(obj => {
      fabricCanvas.add(obj);
    });
    
    fabricCanvas.setActiveObject(objects);
    fabricCanvas.renderAll();
    
    if (debouncedSave && currentVersionIdRef?.current) {
      debouncedSave(fabricCanvas, currentVersionIdRef.current);
    }
  }, [fabricCanvas, selectedObj, debouncedSave, currentVersionIdRef]);

  // Layer management
  const moveObjectLayer = useCallback((direction) => {
    if (!fabricCanvas || !selectedObj) return;

    switch (direction) {
      case 'front':
        fabricCanvas.bringToFront(selectedObj);
        break;
      case 'forward':
        fabricCanvas.bringForward(selectedObj);
        break;
      case 'backward':
        fabricCanvas.sendBackwards(selectedObj);
        break;
      case 'back':
        fabricCanvas.sendToBack(selectedObj);
        break;
    }
    
    fabricCanvas.renderAll();
    setLayersKey(prev => prev + 1);
    
    if (debouncedSave && currentVersionIdRef?.current) {
      debouncedSave(fabricCanvas, currentVersionIdRef.current);
    }
  }, [fabricCanvas, selectedObj, debouncedSave, currentVersionIdRef]);

  const duplicateObject = useCallback(() => {
    if (!fabricCanvas || !selectedObj) return;

    selectedObj.clone((cloned) => {
      cloned.set({
        left: cloned.left + 20,
        top: cloned.top + 20
      });
      cloned.setCoords();
      
      fabricCanvas.add(cloned);
      fabricCanvas.setActiveObject(cloned);
      fabricCanvas.renderAll();
      
      if (debouncedSave && currentVersionIdRef?.current) {
        debouncedSave(fabricCanvas, currentVersionIdRef.current);
      }
    });
  }, [fabricCanvas, selectedObj, debouncedSave, currentVersionIdRef]);

  const deleteObject = useCallback(() => {
    if (!fabricCanvas || !selectedObj) return;

    fabricCanvas.remove(selectedObj);
    fabricCanvas.discardActiveObject();
    fabricCanvas.renderAll();
    
    if (debouncedSave && currentVersionIdRef?.current) {
      debouncedSave(fabricCanvas, currentVersionIdRef.current);
    }
  }, [fabricCanvas, selectedObj, debouncedSave, currentVersionIdRef]);

  // Get object properties for display
  const getObjectProperties = useCallback(() => {
    if (!selectedObj) return null;

    const baseProps = {
      id: selectedObj.customName || selectedObj.id || `${selectedObj.type}_${Date.now()}`,
      type: selectedObj.type,
      left: Math.round(selectedObj.left),
      top: Math.round(selectedObj.top),
      width: Math.round(selectedObj.width * (selectedObj.scaleX || 1)),
      height: Math.round(selectedObj.height * (selectedObj.scaleY || 1)),
      angle: Math.round(selectedObj.angle || 0),
      opacity: Math.round((selectedObj.opacity || 1) * 100),
      visible: selectedObj.visible !== false,
      selectable: selectedObj.selectable !== false
    };

    // Type-specific properties
    if (['text', 'i-text', 'textbox'].includes(selectedObj.type)) {
      return {
        ...baseProps,
        text: selectedObj.text || '',
        fontSize: selectedObj.fontSize || 16,
        fontFamily: selectedObj.fontFamily || 'Arial',
        fontWeight: selectedObj.fontWeight || 'normal',
        fontStyle: selectedObj.fontStyle || 'normal',
        textAlign: selectedObj.textAlign || 'left',
        fill: selectedObj.fill || '#000000',
        backgroundColor: selectedObj.backgroundColor || 'transparent',
        underline: selectedObj.underline || false,
        linethrough: selectedObj.linethrough || false
      };
    }

    if (['rect', 'circle', 'ellipse', 'triangle', 'polygon'].includes(selectedObj.type)) {
      return {
        ...baseProps,
        fill: selectedObj.fill || '#ffffff',
        stroke: selectedObj.stroke || '#000000',
        strokeWidth: selectedObj.strokeWidth || 0,
        rx: selectedObj.rx || 0,
        ry: selectedObj.ry || 0
      };
    }

    if (selectedObj.type === 'image') {
      return {
        ...baseProps,
        src: selectedObj.src || '',
        cropX: selectedObj.cropX || 0,
        cropY: selectedObj.cropY || 0
      };
    }

    if (selectedObj.type === 'group') {
      return {
        ...baseProps,
        objectCount: selectedObj.getObjects().length
      };
    }

    return baseProps;
  }, [selectedObj]);

  // Get all canvas objects for layers panel
  const getCanvasLayers = useCallback(() => {
    if (!fabricCanvas) return [];

    return fabricCanvas.getObjects()
      .filter(obj => !obj.excludeFromExport)
      .map((obj, index) => ({
        id: obj.customName || `${obj.type}_${index}`,
        name: obj.customName || obj.type,
        type: obj.type,
        visible: obj.visible !== false,
        locked: obj.selectable === false,
        object: obj
      }))
      .reverse(); // Show top objects first
  }, [fabricCanvas]);

  return {
    // State
    rightTab,
    setRightTab,
    layersKey,
    
    // Property handlers
    updateProperty,
    updateMultipleProperties,
    updateTextProperty,
    updateShapeProperty,
    updateImageProperty,
    
    // Object operations
    ungroupObjects,
    moveObjectLayer,
    duplicateObject,
    deleteObject,
    
    // Data getters
    getObjectProperties,
    getCanvasLayers
  };
};
