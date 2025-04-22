/**
 * ASCII Map Editor Script v1.2 (Updated for Long Press Edit & Symbol Changes)
 * Handles the logic for creating, editing, saving, and loading ASCII maps
 * with layers, custom symbols (import/exportable), and detailed cell data.
 */
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    // Map Area
    const mapGrid = document.getElementById('map-grid');
    const mapCoordsDisplay = document.getElementById('map-coords');
    // Layer Controls
    const layerSelector = document.getElementById('layer-selector');
    const layerVisibility = document.getElementById('layer-visibility');
    // Symbol Palette
    const paletteContainer = document.getElementById('palette-container');
    const selectedSymbolDisplay = document.getElementById('selected-symbol');
    // Metadata & Legend Display
    const metadataContent = document.getElementById('metadata-content');
    const legendContent = document.getElementById('legend-content');
    // System I/O & Metadata Inputs
    const mapNameInput = document.getElementById('map-name-input');
    const mapDescriptionInput = document.getElementById('map-description-input');
    const importMapFile = document.getElementById('import-map-file');
    const exportMapButton = document.getElementById('export-map-button');
    const ioStatus = document.getElementById('io-status');
    // Dimension Controls
    const rowsInput = document.getElementById('rows-input');
    const colsInput = document.getElementById('cols-input');
    const resizeButton = document.getElementById('resize-button');
    const resizeStatus = document.getElementById('resize-status');
    // Custom Symbols Controls
    const customSymbolsList = document.getElementById('custom-symbols-list');
    const customSymbolCharInput = document.getElementById('custom-symbol-char');
    const customSymbolDescInput = document.getElementById('custom-symbol-desc');
    const addUpdateSymbolButton = document.getElementById('add-update-symbol-button');
    const deleteSymbolButton = document.getElementById('delete-symbol-button');
    const importLegendButton = document.getElementById('import-legend-button');
    const importLegendFileInput = document.getElementById('import-legend-file-input');
    const exportLegendButton = document.getElementById('export-legend-button');
    const customSymbolStatus = document.getElementById('custom-symbol-status');
    // Cell Data Modal Elements
    const cellDataModal = document.getElementById('cell-data-modal');
    const closeModalButton = document.getElementById('close-modal-button');
    const modalCellCoords = document.getElementById('modal-cell-coords');
    const modalCellLayerInput = document.getElementById('modal-cell-layer');
    const modalCellRowInput = document.getElementById('modal-cell-row');
    const modalCellColInput = document.getElementById('modal-cell-col');
    const cellDataDimensionsInput = document.getElementById('cell-data-dimensions');
    const cellDataColorInput = document.getElementById('cell-data-color');
    const cellDataMaterialInput = document.getElementById('cell-data-material');
    const cellDataNotesInput = document.getElementById('cell-data-notes');
    const saveCellDataButton = document.getElementById('save-cell-data-button');
    const deleteCellDataButton = document.getElementById('delete-cell-data-button');
    const modalStatus = document.getElementById('modal-status');
    // Footer Status
    const footerStatus = document.getElementById('footer-status');

    // --- State Variables ---
    let mapData = null;
    let activeLayerName = null;
    let visibleLayers = {};
    let selectedSymbol = 'o'; // Default to 'o' (Empty)
    let isPainting = false;
    let customSymbols = {}; // Global store for custom symbols
    let longPressTimer = null; // Timer for long press detection
    let longPressTargetCell = null; // Cell being pressed
    let isDragging = false; // Flag to prevent long press if mouse moves significantly while down

    // --- Constants ---
    // Updated baseLegend: 'o' is now 'Empty', '.' is 'Floor'
    const baseLegend = { "#": "Wall", "o": "Empty", "@": "User", ".": "Floor" }; // CHANGED HERE
    const localStorageKey = 'asciiMapEditorCustomSymbols';
    const defaultMapStructure = {
      metadata: { name: "Default Grid", dimensions: { rows: 24, cols: 24 }, description: "A blank canvas.", layers: ["terrain", "objects", "agents"] }
    };
    const LONG_PRESS_DURATION = 1000; // 1 second in milliseconds

    // --- Initialization ---
    function init() {
        setStatus("Initializing...");
        loadCustomSymbolsFromStorage(); // Load symbols first
        const initialRows = parseInt(rowsInput.value) || defaultMapStructure.metadata.dimensions.rows; // Use default if input is bad
        const initialCols = parseInt(colsInput.value) || defaultMapStructure.metadata.dimensions.cols; // Use default if input is bad
        const initialName = mapNameInput.value.trim() || defaultMapStructure.metadata.name;
        const initialDesc = mapDescriptionInput.value.trim() || defaultMapStructure.metadata.description;
        const initialMapData = createNewMapData(initialRows, initialCols, initialName, initialDesc);
        loadMapData(initialMapData); // Load uses the loaded customSymbols via getCombinedLegend
        setupEventListeners();
        renderCustomSymbolsList();
        setStatus("Ready.");
        console.log("ASCII Map Editor Initialized.");
    }

    // --- Status Updates ---
    function setStatus(message) {
        if (footerStatus) footerStatus.textContent = message;
        console.log("Status:", message);
        const clearStatus = (el) => { if (el && el.textContent) setTimeout(() => { if(el) el.textContent = ''; }, 5000); };
        clearStatus(ioStatus);
        clearStatus(resizeStatus);
        clearStatus(customSymbolStatus);
        clearStatus(modalStatus);
    }
    function setIOStatus(message, isError = false) {
        if (!ioStatus) return;
        ioStatus.textContent = message;
        ioStatus.style.color = isError ? 'var(--secondary-neon)' : 'var(--tertiary-neon)';
        setStatus(message);
    }
    function setResizeStatus(message, isError = false) {
        if (!resizeStatus) return;
        resizeStatus.textContent = message;
        resizeStatus.style.color = isError ? 'var(--secondary-neon)' : 'var(--tertiary-neon)';
        setStatus(message);
    }
    function setCustomSymbolStatus(message, isError = false) {
        if (!customSymbolStatus) return;
        customSymbolStatus.textContent = message;
        customSymbolStatus.style.color = isError ? 'var(--secondary-neon)' : 'var(--tertiary-neon)';
        setStatus(message); // Also update main status briefly
    }

    // --- LocalStorage Handling (Custom Symbols) ---
    function loadCustomSymbolsFromStorage() {
        try {
            const storedSymbols = localStorage.getItem(localStorageKey);
            customSymbols = storedSymbols ? JSON.parse(storedSymbols) : {};
            console.log("Loaded custom symbols from localStorage:", customSymbols);
        } catch (error) {
            console.error("Error loading custom symbols from localStorage:", error);
            setCustomSymbolStatus("Error loading custom symbols.", true);
            customSymbols = {};
        }
    }
    function saveCustomSymbolsToStorage() {
        try {
            localStorage.setItem(localStorageKey, JSON.stringify(customSymbols));
            console.log("Saved custom symbols to localStorage:", customSymbols);
        } catch (error) {
            console.error("Error saving custom symbols to localStorage:", error);
            setCustomSymbolStatus("Error saving custom symbols.", true);
        }
    }

    // --- Map Data Handling ---
    function getCombinedLegend() {
        // Returns merged baseLegend and current customSymbols
        return { ...baseLegend, ...customSymbols };
    }
    function createNewMapData(rows, cols, name, description) {
        // Creates a fresh map structure, using current customSymbols for the legend part
        const finalRows = Math.max(1, parseInt(rows) || parseInt(rowsInput.value) || defaultMapStructure.metadata.dimensions.rows);
        const finalCols = Math.max(1, parseInt(cols) || parseInt(colsInput.value) || defaultMapStructure.metadata.dimensions.cols);
        const finalName = name || mapNameInput.value.trim() || defaultMapStructure.metadata.name;
        const finalDesc = description || mapDescriptionInput.value.trim() || defaultMapStructure.metadata.description;
        const layerNames = mapData?.metadata?.layers || defaultMapStructure.metadata.layers;
        const defaultChar = 'o'; // CHANGED HERE - Default is 'o' (Empty)
        const newLayers = {};
        const newCellDetails = {};
        layerNames.forEach(layerName => {
            newLayers[layerName] = Array(finalRows).fill(null).map(() => defaultChar.repeat(finalCols)); // Ensure correct creation
            newCellDetails[layerName] = {};
        });
        rowsInput.value = finalRows; colsInput.value = finalCols;
        mapNameInput.value = finalName; mapDescriptionInput.value = finalDesc;
        return {
          metadata: { name: finalName, dimensions: { rows: finalRows, cols: finalCols }, description: finalDesc, layers: layerNames },
          legend: getCombinedLegend(), // Uses current global customSymbols
          layers: newLayers,
          cellDetails: newCellDetails
        };
    }
    /**
     * Loads map data, ensuring the legend in the mapData object reflects the current combined legend.
     * It DOES NOT automatically merge symbols from the file here; that happens in handleImportMap.
     */
    function loadMapData(newData) {
        try {
            if (!newData || !newData.metadata || !newData.layers) throw new Error("Invalid map data structure.");
            if (!newData.metadata.layers || newData.metadata.layers.length === 0) throw new Error("Map data must define layers.");

            mapData = JSON.parse(JSON.stringify(newData)); // Deep copy

            // CRITICAL: Always set the mapData's legend to the CURRENT combined legend state
            // This ensures consistency after potential merges during import.
            mapData.legend = getCombinedLegend();

            // Update UI from loaded metadata
            rowsInput.value = mapData.metadata.dimensions.rows;
            colsInput.value = mapData.metadata.dimensions.cols;
            mapNameInput.value = mapData.metadata.name || '';
            mapDescriptionInput.value = mapData.metadata.description || '';

            // Initialize/validate cellDetails
            if (!mapData.cellDetails) { mapData.cellDetails = {}; }

            // Ensure layers and cellDetails structures match metadata
            const { rows, cols } = mapData.metadata.dimensions;
            const defaultChar = 'o'; // CHANGED HERE
            mapData.metadata.layers.forEach(layerName => {
                let layerNeedsUpdate = false;
                if (!mapData.layers[layerName]) { layerNeedsUpdate = true; }
                else if (!Array.isArray(mapData.layers[layerName]) || mapData.layers[layerName].length !== rows || (rows > 0 && mapData.layers[layerName][0]?.length !== cols)) {
                    layerNeedsUpdate = true; // Check if it's an array and dimensions match
                }

                if (layerNeedsUpdate) {
                    console.warn(`Layer "${layerName}" data invalid or missing, resetting to ${rows}x${cols} default ('${defaultChar}').`);
                    mapData.layers[layerName] = Array(rows).fill(null).map(() => defaultChar.repeat(cols));
                } else {
                    // Further validation: Ensure all row strings have the correct length
                    for(let r = 0; r < rows; r++) {
                        if (typeof mapData.layers[layerName][r] !== 'string' || mapData.layers[layerName][r].length !== cols) {
                            console.warn(`Row ${r} in layer "${layerName}" has incorrect length or type. Resetting row.`);
                            mapData.layers[layerName][r] = defaultChar.repeat(cols);
                        }
                    }
                }

                if (!mapData.cellDetails[layerName]) { mapData.cellDetails[layerName] = {}; }
            });

            // Set initial state
            activeLayerName = mapData.metadata.layers[0];
            visibleLayers = {};
            mapData.metadata.layers.forEach(name => { visibleLayers[name] = true; });
            // Set selected symbol intelligently: prefer 'o' if available, else first in legend
            selectedSymbol = mapData.legend['o'] ? 'o' : (Object.keys(mapData.legend).length > 0 ? Object.keys(mapData.legend)[0] : '#'); // CHANGED HERE

            renderAll(); // Update UI
            setIOStatus(`Map "${mapData.metadata.name || 'Untitled'}" loaded.`);

        } catch (error) {
            console.error("Error loading map data:", error);
            setIOStatus(`Error loading map: ${error.message}`, true);
        }
    }


    // --- Rendering Functions ---
    function renderAll() {
        if (!mapData) return;
        setStatus("Rendering...");
        renderMapGrid(); renderLayerControls(); renderSymbolPalette();
        renderLegend(); renderMetadata(); updateSelectedSymbolDisplay();
        renderCustomSymbolsList();
        setStatus("Ready.");
    }
    function renderMapGrid() {
        if (!mapGrid || !mapData) return; mapGrid.innerHTML = '';
        const { rows, cols } = mapData.metadata.dimensions;
        const layersToRender = mapData.metadata.layers.filter(name => visibleLayers[name]);
        mapGrid.style.setProperty('--map-cols', cols); mapGrid.style.setProperty('--map-rows', rows);
        mapGrid.style.setProperty('--cell-size', determineCellSize(rows, cols) + 'px');
        const emptyChar = 'o'; // CHANGED HERE

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = document.createElement('div'); cell.classList.add('map-cell');
                cell.dataset.row = r; cell.dataset.col = c;
                let charToShow = emptyChar; // Default to empty
                // Iterate from top visible layer downwards
                for (let i = layersToRender.length - 1; i >= 0; i--) {
                    const layerName = layersToRender[i];
                    // Ensure layer and row exist and are strings
                    if (mapData.layers[layerName] && typeof mapData.layers[layerName][r] === 'string' && c < mapData.layers[layerName][r].length) {
                         const char = mapData.layers[layerName][r][c];
                         // Show the character if it's not the designated empty character
                         if (char && char !== emptyChar) {
                            charToShow = char;
                            break; // Found the top-most non-empty character for this cell
                         }
                    } else {
                         // Log error if data structure is unexpectedly wrong
                         console.warn(`Invalid data access attempt at renderMapGrid: layer=${layerName}, row=${r}, col=${c}`);
                    }
                }
                cell.textContent = charToShow;
                const cellKey = `${r}_${c}`; let hasDataOnVisibleLayer = false;
                for (const layerName of layersToRender) { if (mapData.cellDetails?.[layerName]?.[cellKey]) { hasDataOnVisibleLayer = true; break; } }
                cell.classList.toggle('has-data', hasDataOnVisibleLayer);
                mapGrid.appendChild(cell);
            }
        }
        mapCoordsDisplay.textContent = `Row: - Col: -`;
    }
    function determineCellSize(rows, cols) {
        const mapArea = mapGrid.parentElement; if (!mapArea) return 20;
        const padding = 20; const coordsHeight = 30;
        const maxWidth = mapArea.clientWidth - padding; const maxHeight = mapArea.clientHeight - padding - coordsHeight;
        // Ensure cols and rows are at least 1 to avoid division by zero
        const safeCols = Math.max(1, cols);
        const safeRows = Math.max(1, rows);
        const cellWidth = Math.max(1, Math.floor(maxWidth / safeCols));
        const cellHeight = Math.max(1, Math.floor(maxHeight / safeRows));
        // if (cellWidth <= 0 || cellHeight <= 0) return 10; // Check should be redundant now
        return Math.max(8, Math.min(cellWidth, cellHeight, 40));
    }
    function renderLayerControls() {
        if (!layerSelector || !layerVisibility || !mapData) return;
        layerSelector.innerHTML = ''; layerVisibility.innerHTML = '';
        mapData.metadata.layers.forEach((layerName) => {
            const safeName = layerName.replace(/\s+/g, '-'); // Basic sanitization for ID
            const radioId = `layer-select-${safeName}-${Math.random().toString(16).slice(2)}`; // Add random suffix for uniqueness
            const radioLabel = document.createElement('label'); radioLabel.htmlFor = radioId;
            const radioInput = document.createElement('input'); radioInput.type = 'radio'; radioInput.id = radioId; radioInput.name = 'layer-select'; radioInput.value = layerName; radioInput.checked = (layerName === activeLayerName);
            radioLabel.append(radioInput, ` ${layerName} (Edit)`); layerSelector.appendChild(radioLabel);

            const checkId = `layer-visible-${safeName}-${Math.random().toString(16).slice(2)}`; // Add random suffix
            const checkLabel = document.createElement('label'); checkLabel.htmlFor = checkId;
            const checkInput = document.createElement('input'); checkInput.type = 'checkbox'; checkInput.id = checkId; checkInput.value = layerName; checkInput.checked = !!visibleLayers[layerName];
            checkLabel.append(checkInput, ` ${layerName} (Visible)`); layerVisibility.appendChild(checkLabel);
        });
    }
    function renderSymbolPalette() {
        // Renders palette based on getCombinedLegend()
        if (!paletteContainer || !mapData) return; paletteContainer.innerHTML = '';
        const combinedLegend = getCombinedLegend();
        Object.keys(combinedLegend).sort().forEach(symbol => {
            const symbolEl = document.createElement('span'); symbolEl.classList.add('palette-symbol');
            symbolEl.textContent = symbol; symbolEl.dataset.symbol = symbol; symbolEl.title = combinedLegend[symbol];
            symbolEl.classList.toggle('selected', symbol === selectedSymbol); symbolEl.dataset.isBase = baseLegend.hasOwnProperty(symbol);
            paletteContainer.appendChild(symbolEl);
        });
    }
    function renderLegend() {
        // Renders legend display based on getCombinedLegend()
        if (!legendContent || !mapData) return;
        legendContent.textContent = JSON.stringify(getCombinedLegend(), null, 2);
    }
    function renderMetadata() {
        // Renders metadata display based on mapData.metadata
         if (!metadataContent || !mapData) return;
         // Ensure metadata object exists before accessing properties
         if (mapData.metadata) {
             mapData.metadata.name = mapNameInput.value.trim();
             mapData.metadata.description = mapDescriptionInput.value.trim();
             metadataContent.textContent = JSON.stringify(mapData.metadata, null, 2);
         } else {
             metadataContent.textContent = "Error: Map metadata is missing.";
             console.error("Attempted to render missing map metadata");
         }
    }
    function updateSelectedSymbolDisplay() {
         if (!selectedSymbolDisplay) return; selectedSymbolDisplay.textContent = selectedSymbol;
         document.querySelectorAll('.palette-symbol').forEach(el => { el.classList.toggle('selected', el.dataset.symbol === selectedSymbol); });
     }
     function renderCustomSymbolsList() {
        // Renders list based on global customSymbols state
        if (!customSymbolsList) return; customSymbolsList.innerHTML = '';
        Object.entries(customSymbols).sort().forEach(([symbol, description]) => {
            const li = document.createElement('li'); li.textContent = `'${symbol}': ${description}`;
            li.dataset.symbol = symbol; li.dataset.description = description; li.style.cursor = 'pointer'; li.title = 'Click to edit';
            customSymbolsList.appendChild(li);
        });
     }

    // --- Event Handlers Setup ---
    function setupEventListeners() {
        // Map Interaction
        mapGrid.addEventListener('mousedown', handleMapMouseDown);
        mapGrid.addEventListener('mousemove', handleMapMouseMove); // Changed handler
        document.addEventListener('mouseup', handleMapMouseUp); // Use document to catch mouseup outside grid
        mapGrid.addEventListener('mouseleave', handleMapMouseLeave);
        // mapGrid.addEventListener('dblclick', handleMapDoubleClick); // REMOVED

        // Control Panel
        layerSelector.addEventListener('change', handleLayerSelectChange);
        layerVisibility.addEventListener('change', handleLayerVisibilityChange);
        paletteContainer.addEventListener('click', handleSymbolClick);
        importMapFile.addEventListener('change', handleImportMap);
        exportMapButton.addEventListener('click', handleExportMap);
        resizeButton.addEventListener('click', handleResizeClick);
        addUpdateSymbolButton.addEventListener('click', handleAddUpdateSymbol);
        deleteSymbolButton.addEventListener('click', handleDeleteSymbol);
        customSymbolsList.addEventListener('click', handleCustomSymbolListClick);
        mapNameInput.addEventListener('input', handleMetadataChange);
        mapDescriptionInput.addEventListener('input', handleMetadataChange);

        // Legend I/O
        importLegendButton.addEventListener('click', () => importLegendFileInput.click());
        importLegendFileInput.addEventListener('change', handleImportLegend);
        exportLegendButton.addEventListener('click', handleExportLegend);

        // Cell Data Modal
        closeModalButton.addEventListener('click', closeCellDataModal);
        saveCellDataButton.addEventListener('click', saveCellData);
        deleteCellDataButton.addEventListener('click', () => deleteCellData(true));

        // Window Resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => { if (mapData) renderMapGrid(); }, 150);
        });

        // Prevent context menu on the map grid (optional, can interfere with long press)
        mapGrid.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    // --- Map Interaction Event Handlers ---
    function paintCell(cell) {
        if (!cell || !cell.classList.contains('map-cell') || !activeLayerName || !mapData) return;
        const row = parseInt(cell.dataset.row); const col = parseInt(cell.dataset.col);

        // Check if layer and row exist and row is a string
        if (mapData.layers[activeLayerName] && typeof mapData.layers[activeLayerName][row] === 'string') {
            let rowString = mapData.layers[activeLayerName][row];
            if (col >= 0 && col < rowString.length && rowString[col] !== selectedSymbol) {
                 mapData.layers[activeLayerName][row] = rowString.substring(0, col) + selectedSymbol + rowString.substring(col + 1);
                 updateCellDisplay(row, col);
            }
        } else {
             console.warn(`Cannot paint: Invalid layer/row access. Layer: ${activeLayerName}, Row: ${row}`);
        }
    }
    function updateCellDisplay(r, c) {
        const cell = mapGrid.querySelector(`.map-cell[data-row="${r}"][data-col="${c}"]`); if (!cell || !mapData) return;
        const layersToRender = mapData.metadata.layers.filter(name => visibleLayers[name]);
        const emptyChar = 'o'; // CHANGED HERE
        let charToShow = emptyChar; // Default to empty
        for (let i = layersToRender.length - 1; i >= 0; i--) {
             const layerName = layersToRender[i];
             // Add checks for valid layer/row/column access
             if (mapData.layers[layerName] && typeof mapData.layers[layerName][r] === 'string' && c < mapData.layers[layerName][r].length) {
                 const char = mapData.layers[layerName][r][c];
                 if (char && char !== emptyChar) { // Show if not the empty char
                    charToShow = char; break;
                 }
             } else {
                 // Optionally log if data structure seems wrong during rendering
                 // console.warn(`Invalid data structure during updateCellDisplay for layer ${layerName}, row ${r}`);
             }
        }
        cell.textContent = charToShow; const cellKey = `${r}_${c}`; let hasDataOnVisibleLayer = false;
        for (const layerName of layersToRender) { if (mapData.cellDetails?.[layerName]?.[cellKey]) { hasDataOnVisibleLayer = true; break; } }
        cell.classList.toggle('has-data', hasDataOnVisibleLayer);
    }

    // --- Long Press & Painting Logic ---

    function handleMapMouseDown(event) {
        // Only react to left-click (button 0)
        if (event.button !== 0) return;
        const targetCell = event.target.closest('.map-cell');
        if (targetCell) {
            event.preventDefault(); // Prevent text selection/dragging images
            isDragging = false; // Reset drag flag
            longPressTargetCell = targetCell; // Store the cell being pressed

            // Start paint immediately if it's a simple click
            isPainting = true;
            paintCell(targetCell);
            setStatus(`Painting with '${selectedSymbol}' on layer "${activeLayerName}"...`);

            // Clear any existing timer and start a new one for long press
            clearTimeout(longPressTimer);
            longPressTimer = setTimeout(() => {
                // Timer completed: If not dragging, trigger long press action
                if (!isDragging && longPressTargetCell) {
                    console.log("Long press detected!");
                    isPainting = false; // Stop painting if long press triggered
                    setStatus("Opening cell data...");
                    const row = parseInt(longPressTargetCell.dataset.row);
                    const col = parseInt(longPressTargetCell.dataset.col);
                    openCellDataModal(activeLayerName, row, col);
                    longPressTargetCell = null; // Reset target cell after action
                    longPressTimer = null; // Reset timer
                }
            }, LONG_PRESS_DURATION);
        }
    }

    function handleMapMouseMove(event) {
        const targetCell = event.target.closest('.map-cell');

        // Update coordinates display
        if (targetCell) {
             const row = targetCell.dataset.row; const col = targetCell.dataset.col;
             mapCoordsDisplay.textContent = `Row: ${row} Col: ${col}`;
        } else {
             mapCoordsDisplay.textContent = `Row: - Col: -`;
        }

        // If mouse button is down (implies painting or potential long press start)
        if (isPainting || longPressTimer) {
             // Detect if mouse moved significantly (cancel long press, continue painting)
             if (targetCell !== longPressTargetCell) {
                 isDragging = true; // Set drag flag
                 clearTimeout(longPressTimer); // Cancel long press timer if mouse moves to another cell
                 longPressTimer = null;
                 longPressTargetCell = null; // Clear target cell
             }

             // Continue painting if isPainting is true and mouse is over a cell
             if (isPainting && targetCell) {
                 paintCell(targetCell);
             }
        }
    }


    function handleMapMouseUp(event) {
        if (event.button !== 0) return; // Only react to left-click release
        // Clear the long press timer regardless of whether it fired
        clearTimeout(longPressTimer);
        longPressTimer = null;
        longPressTargetCell = null;
        isDragging = false;

        if (isPainting) {
            isPainting = false;
            setStatus("Ready.");
        }
    }

    function handleMapMouseLeave(event) {
        // If mouse leaves the grid while potentially painting or long pressing
        mapCoordsDisplay.textContent = `Row: - Col: -`;
        // Clear long press timer if mouse leaves the grid
        clearTimeout(longPressTimer);
        longPressTimer = null;
        longPressTargetCell = null;
        isDragging = false; // Reset dragging state

        // Optionally stop painting if mouse leaves grid - depends on desired behavior
        // if (isPainting) {
        //     isPainting = false;
        //     setStatus("Ready.");
        // }
    }

    // REMOVED handleMapDoubleClick

    // --- Control Panel Event Handlers ---
    function handleResizeClick() {
        const newRows = parseInt(rowsInput.value); const newCols = parseInt(colsInput.value); const newName = mapNameInput.value.trim(); const newDesc = mapDescriptionInput.value.trim();
        if (isNaN(newRows) || isNaN(newCols) || newRows < 1 || newCols < 1) { setResizeStatus("Invalid dimensions.", true); return; }

        // Check if mapData and its structure exist before accessing
        const currentRows = mapData?.metadata?.dimensions?.rows;
        const currentCols = mapData?.metadata?.dimensions?.cols;
        const currentName = mapData?.metadata?.name;
        const currentDesc = mapData?.metadata?.description;

        // Only compare if current dimensions/metadata actually exist
        if (mapData && mapData.metadata && mapData.metadata.dimensions &&
            (newRows === currentRows && newCols === currentCols && newName === currentName && newDesc === currentDesc)) {
             setResizeStatus("Map properties unchanged.", false); return;
        }

        // Confirmation logic
        if (mapData) {
             if (!confirm(`Creating a new grid (${newRows}x${newCols}) will discard the current map content and associated cell data. Proceed?`)) {
                 // Restore previous values if they exist
                 rowsInput.value = currentRows ?? defaultMapStructure.metadata.dimensions.rows;
                 colsInput.value = currentCols ?? defaultMapStructure.metadata.dimensions.cols;
                 mapNameInput.value = currentName ?? defaultMapStructure.metadata.name;
                 mapDescriptionInput.value = currentDesc ?? defaultMapStructure.metadata.description;
                 setResizeStatus("Resize cancelled."); return;
             }
        }
        setStatus(`Creating new grid (${newRows}x${newCols})...`); const newMap = createNewMapData(newRows, newCols, newName, newDesc); loadMapData(newMap); setResizeStatus(`New ${newRows}x${newCols} grid created.`);
     }
    function handleLayerSelectChange(event) {
        if (event.target.type === 'radio' && event.target.name === 'layer-select') { activeLayerName = event.target.value; setStatus(`Active layer set to "${activeLayerName}"`); }
    }
    function handleLayerVisibilityChange(event) {
         if (event.target.type === 'checkbox') { const layerName = event.target.value; visibleLayers[layerName] = event.target.checked; setStatus(`Layer "${layerName}" visibility toggled.`); renderMapGrid(); }
    }
     function handleSymbolClick(event) {
         const targetSymbol = event.target.closest('.palette-symbol'); if (targetSymbol) { selectedSymbol = targetSymbol.dataset.symbol; setStatus(`Selected symbol: ${selectedSymbol}`); updateSelectedSymbolDisplay(); }
     }

    // --- Custom Symbol Event Handlers ---
    function handleAddUpdateSymbol() {
        const symbolChar = customSymbolCharInput.value.trim(); const symbolDesc = customSymbolDescInput.value.trim();
        if (symbolChar.length !== 1) { setCustomSymbolStatus("Symbol must be single character.", true); return; }
        if (!symbolDesc) { setCustomSymbolStatus("Description cannot be empty.", true); return; }
        if (baseLegend.hasOwnProperty(symbolChar)) { setCustomSymbolStatus(`Cannot modify base symbol '${symbolChar}'.`, true); return; }
        const isUpdate = customSymbols.hasOwnProperty(symbolChar); customSymbols[symbolChar] = symbolDesc;
        saveCustomSymbolsToStorage();
        // Update mapData's legend immediately AFTER updating customSymbols
        if (mapData) mapData.legend = getCombinedLegend();
        renderCustomSymbolsList(); renderSymbolPalette(); renderLegend();
        setCustomSymbolStatus(`Symbol '${symbolChar}' ${isUpdate ? 'updated' : 'added'}.`, false);
        customSymbolCharInput.value = ''; customSymbolDescInput.value = '';
    }
    function handleDeleteSymbol() {
        const symbolChar = customSymbolCharInput.value.trim();
        if (symbolChar.length !== 1) { setCustomSymbolStatus("Enter symbol to delete.", true); return; }
        if (baseLegend.hasOwnProperty(symbolChar)) { setCustomSymbolStatus(`Cannot delete base symbol '${symbolChar}'.`, true); return; }
        if (!customSymbols.hasOwnProperty(symbolChar)) { setCustomSymbolStatus(`Custom symbol '${symbolChar}' not found.`, true); return; }
        if (!confirm(`Delete custom symbol '${symbolChar}'?`)) { setCustomSymbolStatus("Deletion cancelled."); return; }
        delete customSymbols[symbolChar]; saveCustomSymbolsToStorage();
        // Update mapData's legend immediately
        if (mapData) mapData.legend = getCombinedLegend();
        renderCustomSymbolsList(); renderSymbolPalette(); renderLegend();
        if (selectedSymbol === symbolChar) {
             // Fallback to 'o' (empty) or first available symbol if 'o' is deleted (unlikely for base)
             selectedSymbol = baseLegend['o'] ? 'o' : (Object.keys(getCombinedLegend()).length > 0 ? Object.keys(getCombinedLegend())[0] : '#');
             updateSelectedSymbolDisplay(); setStatus(`Selected symbol reset to '${selectedSymbol}'.`);
        }
        setCustomSymbolStatus(`Custom symbol '${symbolChar}' deleted.`, false);
        customSymbolCharInput.value = ''; customSymbolDescInput.value = '';
    }
     function handleCustomSymbolListClick(event) {
         const targetLi = event.target.closest('li[data-symbol]');
         if (targetLi) { const symbol = targetLi.dataset.symbol; const description = targetLi.dataset.description; customSymbolCharInput.value = symbol; customSymbolDescInput.value = description; setCustomSymbolStatus(`Editing symbol '${symbol}'. Click Add/Update or Delete.`); }
     }

    // --- Cell Data Modal Event Handlers ---
    function openCellDataModal(layer, row, col) {
        if (!cellDataModal || !mapData) {
             console.error("Cannot open modal: Modal element or mapData is missing.");
             setStatus("Error opening cell data modal.", true);
             return;
         }
         // Ensure the layer exists in cellDetails before trying to access it
         if (!mapData.cellDetails || !mapData.cellDetails[layer]) {
             // If the layer structure doesn't exist, create it
             if (!mapData.cellDetails) mapData.cellDetails = {};
             mapData.cellDetails[layer] = {};
             console.warn(`Created missing cellDetails structure for layer: ${layer}`);
         }

        const cellKey = `${row}_${col}`; const currentData = mapData.cellDetails[layer][cellKey] || {};
        modalCellCoords.textContent = `Layer: ${layer}, Row: ${row}, Col: ${col}`; modalCellLayerInput.value = layer; modalCellRowInput.value = row; modalCellColInput.value = col;
        cellDataDimensionsInput.value = currentData.dimensions || ''; cellDataColorInput.value = currentData.color || ''; cellDataMaterialInput.value = currentData.material || ''; cellDataNotesInput.value = currentData.notes || '';
        modalStatus.textContent = ''; cellDataModal.style.display = 'block'; cellDataDimensionsInput.focus();
        setStatus(`Editing cell data for ${layer} [${row}, ${col}]`);
    }
    function closeCellDataModal() {
        if (cellDataModal) cellDataModal.style.display = 'none';
        setStatus("Ready."); // Reset status after closing modal
    }
    function saveCellData() {
        if (!mapData) return; const layer = modalCellLayerInput.value; const row = parseInt(modalCellRowInput.value); const col = parseInt(modalCellColInput.value); const cellKey = `${row}_${col}`;
        if (isNaN(row) || isNaN(col) || !layer || !mapData?.cellDetails?.[layer]) { modalStatus.textContent = 'Error: Invalid cell reference.'; modalStatus.style.color = 'var(--secondary-neon)'; setStatus('Modal save error.'); return; }
        const newData = { dimensions: cellDataDimensionsInput.value.trim(), color: cellDataColorInput.value.trim(), material: cellDataMaterialInput.value.trim(), notes: cellDataNotesInput.value.trim(), };
        const hasData = Object.values(newData).some(val => val !== '');
        if (hasData) { mapData.cellDetails[layer][cellKey] = newData; modalStatus.textContent = 'Data saved.'; modalStatus.style.color = 'var(--tertiary-neon)'; }
        else { deleteCellData(false); modalStatus.textContent = 'Data cleared (all fields empty).'; modalStatus.style.color = 'var(--tertiary-neon)'; setTimeout(() => { if (modalStatus) modalStatus.textContent = ''; }, 3000); return; }
        updateCellDisplay(row, col); setTimeout(() => { if (modalStatus) modalStatus.textContent = ''; }, 3000); setStatus('Cell data saved.');
    }
     function deleteCellData(confirmDeletion = true) {
        if (!mapData) return; const layer = modalCellLayerInput.value; const row = parseInt(modalCellRowInput.value); const col = parseInt(modalCellColInput.value); const cellKey = `${row}_${col}`;
        if (isNaN(row) || isNaN(col) || !layer || !mapData?.cellDetails?.[layer]) { modalStatus.textContent = 'Error: Invalid cell reference.'; modalStatus.style.color = 'var(--secondary-neon)'; setStatus('Modal delete error.'); return; }
        if (mapData.cellDetails[layer][cellKey]) { if (confirmDeletion && !confirm(`Delete all associated data for cell (${row}, ${col}) on layer "${layer}"?`)) { modalStatus.textContent = 'Deletion cancelled.'; modalStatus.style.color = 'var(--tertiary-neon)'; setTimeout(() => { if (modalStatus) modalStatus.textContent = ''; }, 3000); setStatus('Cell data deletion cancelled.'); return; } delete mapData.cellDetails[layer][cellKey]; modalStatus.textContent = 'Data deleted.'; modalStatus.style.color = 'var(--tertiary-neon)'; setStatus('Cell data deleted.'); cellDataDimensionsInput.value = ''; cellDataColorInput.value = ''; cellDataMaterialInput.value = ''; cellDataNotesInput.value = ''; updateCellDisplay(row, col); }
        else { modalStatus.textContent = 'No data to delete for this cell.'; modalStatus.style.color = 'var(--tertiary-neon)'; }
         setTimeout(() => { if (modalStatus) modalStatus.textContent = ''; }, 3000);
    }

    // --- File I/O Event Handlers ---

    /** Handles importing a full map file (.json). */
    function handleImportMap(event) {
        const file = event.target.files[0];
        if (!file) { setIOStatus("No map file selected.", true); return; }
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                setStatus(`Importing map from ${file.name}...`);

                // --- Merge Custom Symbols from Imported Map ---
                let symbolsMerged = 0;
                if (importedData.legend && typeof importedData.legend === 'object') {
                    console.log("Found legend in imported map. Merging custom symbols...");
                    for (const symbol in importedData.legend) {
                        // Only merge if it's NOT a base symbol AND is a single character
                        if (!baseLegend.hasOwnProperty(symbol) && symbol.length === 1) {
                            const description = importedData.legend[symbol];
                            if (typeof description === 'string') {
                                if (!customSymbols[symbol] || customSymbols[symbol] !== description) {
                                    customSymbols[symbol] = description; // Add or update
                                    symbolsMerged++;
                                }
                            } else {
                                console.warn(`Ignoring invalid description for symbol '${symbol}' in imported map legend.`);
                            }
                        }
                    }
                    if (symbolsMerged > 0) {
                        console.log(`Merged ${symbolsMerged} custom symbol(s) from map legend.`);
                        saveCustomSymbolsToStorage(); // Save merged symbols
                        // UI that depends on customSymbols is updated *during* loadMapData call below
                    } else {
                        console.log("No new or updated custom symbols found in map legend to merge.");
                    }
                } else {
                    console.log("No legend found in imported map file, or legend is not an object.");
                }
                // --- End Symbol Merge ---

                // Now load the map data. loadMapData internally calls getCombinedLegend,
                // so it will use the merged symbols correctly.
                loadMapData(importedData);
                // renderAll() is called inside loadMapData, ensuring UI updates

            } catch (error) {
                console.error("Map Import Error:", error);
                setIOStatus(`Map import failed: ${error.message}`, true);
            } finally {
                if (importMapFile) importMapFile.value = null; // Reset file input
            }
        };
        reader.onerror = (e) => { setIOStatus(`Error reading map file: ${e.target.error?.message || 'Unknown read error'}`, true); if (importMapFile) importMapFile.value = null; };
        reader.readAsText(file);
    }

    /** Handles exporting the current map state to a JSON file. */
    function handleExportMap() {
        if (!mapData) { setIOStatus("No map data to export.", true); return; }
        try {
            // Ensure metadata and legend are up-to-date before exporting
            mapData.metadata.name = mapNameInput.value.trim() || 'Unnamed Map';
            mapData.metadata.description = mapDescriptionInput.value.trim();
            mapData.legend = getCombinedLegend(); // Ensure legend reflects current custom symbols

            const jsonData = JSON.stringify(mapData, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' }); const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            // Generate a safe filename
            const safeName = (mapData.metadata.name || 'ascii_map').replace(/[^a-z0-9_\-\.]/gi, '_').replace(/__+/g, '_');
            const fileName = safeName + '.json';
            a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
            setIOStatus(`Map exported as ${fileName}.`, false);
        } catch (error) { console.error("Map Export Error:", error); setIOStatus(`Map export failed: ${error.message}`, true); }
    }

    /** Handles importing a custom symbol legend file (.json). This REPLACES current custom symbols. */
    function handleImportLegend(event) {
        const file = event.target.files[0];
        if (!file) { setCustomSymbolStatus("No legend file selected.", true); return; }
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const importedLegend = JSON.parse(e.target.result);
                setStatus(`Importing legend from ${file.name}...`);

                // Validate imported data is an object
                if (typeof importedLegend !== 'object' || importedLegend === null || Array.isArray(importedLegend)) {
                    throw new Error("Invalid legend file format. Expected a JSON object.");
                }

                const newCustomSymbols = {};
                let importedCount = 0;
                let skippedBase = 0;
                let skippedInvalid = 0;

                // Process imported symbols
                for (const symbol in importedLegend) {
                    // Skip base symbols defined in `baseLegend`
                    if (baseLegend.hasOwnProperty(symbol)) {
                        skippedBase++;
                        continue;
                    }
                    // Validate symbol (single char) and description (string)
                    if (symbol.length === 1 && typeof importedLegend[symbol] === 'string' && importedLegend[symbol].trim()) { // Also check non-empty description
                        newCustomSymbols[symbol] = importedLegend[symbol].trim();
                        importedCount++;
                    } else {
                        skippedInvalid++;
                        console.warn(`Skipping invalid entry in legend file: Symbol='${symbol}', Description='${importedLegend[symbol]}'`);
                    }
                }

                // Replace current custom symbols with the newly imported ones
                customSymbols = newCustomSymbols;
                saveCustomSymbolsToStorage(); // Save the new set

                // Update mapData's legend immediately to reflect change
                if(mapData) mapData.legend = getCombinedLegend();

                // Update UI (render*) functions will use the new combined legend
                renderCustomSymbolsList();
                renderSymbolPalette();
                renderLegend(); // Update main legend display

                let statusMsg = `Legend imported: ${importedCount} custom symbol(s) loaded.`;
                if (skippedBase > 0) statusMsg += ` (${skippedBase} base symbol(s) ignored).`;
                if (skippedInvalid > 0) statusMsg += ` (${skippedInvalid} invalid entries ignored).`;
                setCustomSymbolStatus(statusMsg, false);

            } catch (error) {
                console.error("Legend Import Error:", error);
                setCustomSymbolStatus(`Legend import failed: ${error.message}`, true);
            } finally {
                if (importLegendFileInput) importLegendFileInput.value = null; // Reset file input
            }
        };
        reader.onerror = (e) => { setCustomSymbolStatus(`Error reading legend file: ${e.target.error?.message || 'Unknown read error'}`, true); if (importLegendFileInput) importLegendFileInput.value = null; };
        reader.readAsText(file);
    }

    /** Handles exporting the current custom symbols to a JSON file. */
    function handleExportLegend() {
        if (Object.keys(customSymbols).length === 0) {
            setCustomSymbolStatus("No custom symbols to export.", true);
            return;
        }
        try {
            const jsonData = JSON.stringify(customSymbols, null, 2); // Export only customSymbols
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            // Suggest a filename based on map name or default
            const safeName = (mapNameInput.value.trim().replace(/[^a-z0-9_\-\.]/gi, '_') || 'custom_symbols').replace(/__+/g, '_');
            const fileName = safeName + '_legend.json';
            a.href = url; a.download = fileName;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setCustomSymbolStatus(`Custom symbols legend exported as ${fileName}.`, false);
        } catch (error) {
            console.error("Legend Export Error:", error);
            setCustomSymbolStatus(`Legend export failed: ${error.message}`, true);
        }
    }

    // --- Metadata Input Handler ---
    function handleMetadataChange(event) {
        if (!mapData || !mapData.metadata) return; const { id, value } = event.target;
        if (id === 'map-name-input') { mapData.metadata.name = value.trim(); }
        else if (id === 'map-description-input') { mapData.metadata.description = value.trim(); }
        renderMetadata(); // Re-render metadata display when inputs change
    }

    // --- Start the application ---
    init();
});