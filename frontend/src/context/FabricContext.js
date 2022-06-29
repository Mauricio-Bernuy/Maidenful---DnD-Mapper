import React, {
    useCallback,
    createContext,
    useState,
}                                 from "react"
import { fabric }                 from "fabric"
import { initAligningGuidelines } from "../components/handlers/aligning_guidelines"
import { initHotkeys } from "../components/handlers/initHotkeys"

export const FabricContext = createContext([])

export const FabricContextProvider = ({ children }) => {
    const [canvas, setCanvas] = useState(null)
    const [activeObject, setActiveObject] = useState(null)
    const [dimensions, setDimensions] = useState({
		gridSizeX: 20,
        gridSizeY: 10,
    })
    const [layerLevel, setLayerLevel] = useState(-1)
    const [prevGrid, setPrevGrid] = useState([])


    const [loadedMapName, setloadedMapName] = useState("default_map_name")
    
    const initCanvas = useCallback((el, initialSize) => {
        const canvasOptions = {
            preserveObjectStacking: true,
            selection: true,
            defaultCursor: "default",
            backgroundColor: "#181818",
            fireMiddleClick: true,
            fireRightClick: true,
            imageSmoothingEnabled: false,

        }
        let c = new fabric.Canvas(el, canvasOptions)
        
        initAligningGuidelines(c)
        
        // initHotkeys(c, canvas)
        
        c.renderAll()
        setCanvas(c)
        
        fabric.devicePixelRatio = 2; // oversampling, higher values produce sharper output, decreases performance
        c.setWidth(initialSize.width);
        c.setHeight(initialSize.height);
        
        
        c.renderAll();
            
        c.calcOffset();


		// c.selection = false


        fabric.Object.prototype.borderColor = 'darkred';
        fabric.Object.prototype.cornerColor = 'darkred';
        fabric.Object.prototype.transparentCorners = false;

    }, [])
    

    const loadFromJSON = useCallback((el, json) => {
        let c = new fabric.Canvas(el)
        c.loadFromJSON(
            json,
            () => {
                c.renderAll.bind(c)
                c.setWidth(json.width)
                c.setHeight(json.height)
            },
            function(o, object) {
                fabric.log(o, object)
            })
        c.renderAll()
        setCanvas(c)
    }, [])

    
    const centerCanvasOnGrid = (e) => {
		let group = prevGrid[0]
		console.log(group.width, group.height)
        
		let zoomX =  canvas.height / (group.height)
		let zoomY =  canvas.width / (group.width)
		let zoom = Math.min(zoomX, zoomY) *0.9

        console.log("group",group.left,group.top)
        
        var vpt = canvas.viewportTransform;

        let prevState={
            vpt: [...vpt]
        }

        canvas.setViewportTransform([zoom, 0, 0, zoom, 0, 0]);
        return(prevState)
    }

    const removeObjects = (e) => {
        canvas.getActiveObjects().forEach((obj) => {
            canvas.remove(obj)
        });
        canvas.discardActiveObject().renderAll();
        console.log('deleted object(s)');
    }

    var _clipboard = null

    const Copy = (e) => {

        if (!canvas.getActiveObject()){
            console.log("no selection")
            return;
        }

        // clone what are you copying since you
        // may want copy and paste on different moment.
        // and you do not want the changes happened
        // later to reflect on the copy.

        let toCopy = canvas.getActiveObject()

        toCopy.clone(function(cloned) {
            cloned.set({
                selectable: toCopy.selectable,
                hasControls: toCopy.hasControls,
                lockMovementX: toCopy.lockMovementX,
                lockMovementY: toCopy.lockMovementY,
                lockSkewingX: toCopy.lockSkewingX,
                lockSkewingY: toCopy.lockSkewingY,
                objectCaching: toCopy.objectCaching,                
            })

            if (cloned.type === 'activeSelection') {
                let i = 0
                cloned.forEachObject(function(obj) {
                    obj.set({
                        selectable: toCopy._objects[i].selectable,
                        hasControls: toCopy._objects[i].hasControls,
                        lockMovementX: toCopy._objects[i].lockMovementX,
                        lockMovementY: toCopy._objects[i].lockMovementY,
                        lockSkewingX: toCopy._objects[i].lockSkewingX,
                        lockSkewingY: toCopy._objects[i].lockSkewingY,
                        objectCaching: toCopy._objects[i].objectCaching,  
                    });
                    i++;
                });
            }
            _clipboard = cloned;
            
        });
    }
    
    const Paste = (opt) =>{

        if (!_clipboard){
            console.log("clipboard empty")
            return;
        }
        // clone again, so you can do multiple copies.
        _clipboard.clone(function(clonedObj) {
            canvas.discardActiveObject();

            // TODO get mouse coords here
            // let pointer = canvas.getPointer();
            // let topPos = pointer.y - _clipboard.getScaledHeight() / 2;
            // let leftPos = pointer.x - _clipboard.getScaledWidth() / 2;


            clonedObj.set({
                selectable: _clipboard.selectable,
                hasControls: _clipboard.hasControls,
                lockMovementX: _clipboard.lockMovementX,
                lockMovementY: _clipboard.lockMovementY,
                lockSkewingX: _clipboard.lockSkewingX,
                lockSkewingY: _clipboard.lockSkewingY,
                objectCaching: _clipboard.objectCaching,                
                left: clonedObj.left + 10,
                top: clonedObj.top + 10,
                // left: leftPos,
                // top: topPos,
                evented: true,
            });

            if (clonedObj.type === 'activeSelection') {
                // active selection needs a reference to the canvas.
                clonedObj.canvas = canvas;
                let i = 0
                clonedObj.forEachObject(function(obj) {
                    obj.set({
                        selectable: _clipboard._objects[i].selectable,
                        hasControls: _clipboard._objects[i].hasControls,
                        lockMovementX: _clipboard._objects[i].lockMovementX,
                        lockMovementY: _clipboard._objects[i].lockMovementY,
                        lockSkewingX: _clipboard._objects[i].lockSkewingX,
                        lockSkewingY: _clipboard._objects[i].lockSkewingY,
                        objectCaching: _clipboard._objects[i].objectCaching,

                        left: obj.left + 10,
                        top: obj.top + 10,
                        evented: true,                
                    });
                    canvas.add(obj);
                    obj.setCoords();

                    if (obj.type === "polyline"){

                        let objects = canvas.getObjects();
                        let linelayer = 1;
                        let lyrs = [];
                        prevGrid.forEach((element) => {
                            lyrs.push(objects.indexOf(element));
                        });
                        lyrs.shift();
                        
                        let layerlevel = Math.min.apply(null, lyrs);
                        linelayer = Math.max(linelayer, layerlevel, layerLevel);
                        obj.moveTo(linelayer);
                    }
                    i++;
                });
                // fixes misaligned boundbox
                clonedObj._restoreObjectsState();
                clonedObj.setCoords();
            } else {
                canvas.add(clonedObj);
                if (clonedObj.type === "polyline"){
                    let objects = canvas.getObjects();
                    let linelayer = 1;
                    let lyrs = [];

                    prevGrid.forEach((element) => {
                        lyrs.push(objects.indexOf(element));
                    });

                    lyrs.shift();
                    let layerlevel = Math.min.apply(null, lyrs);
                    linelayer = Math.max(linelayer, layerlevel, layerLevel);
                    clonedObj.moveTo(linelayer);
                }

            }
            _clipboard.top += 10;
            _clipboard.left += 10;
            canvas.requestRenderAll();
        });
    }



    return (
        <FabricContext.Provider
            value={{ canvas, initCanvas, 
                    loadFromJSON, activeObject, 
                    setActiveObject, 
                    dimensions, setDimensions,
                    loadedMapName, setloadedMapName,
                    layerLevel,setLayerLevel,
                    prevGrid, setPrevGrid,
                    centerCanvasOnGrid,
                    removeObjects,
                    Copy, Paste
                    }}>
            {children}
        </FabricContext.Provider>
    )
}
