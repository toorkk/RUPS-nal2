// logic/wireSystem.js
export class WireSystem {
    constructor(scene) {
        this.scene = scene;
        this.wires = []; // Array of wire objects
        this.drawingWire = false;
        this.currentWire = null;
        this.startPin = null;
        this.wireGraphics = null;
        
        this.setupWireDrawing();
    }
    
    setupWireDrawing() {
        // Create graphics layer for wires
        this.wireGraphics = this.scene.add.graphics();
        this.wireGraphics.setDepth(1); // Below components but above grid
        
        // Enable wire drawing mode
        this.scene.input.on('pointerdown', this.startDrawingWire, this);
        this.scene.input.on('pointermove', this.updateDrawingWire, this);
        this.scene.input.on('pointerup', this.finishDrawingWire, this);
    }
    
    startDrawingWire(pointer) {
        // Find if pointer is over a pin
        const pin = this.findPinAt(pointer.x, pointer.y);
        if (pin && !this.drawingWire) {
            this.drawingWire = true;
            this.startPin = pin;
            
            // Create a temporary wire
            this.currentWire = {
                start: { x: pin.worldX, y: pin.worldY },
                end: { x: pointer.x, y: pointer.y },
                color: 0x666666,
                connected: false
            };
            
            console.log('Started drawing wire from pin:', pin);
        }
    }
    
    updateDrawingWire(pointer) {
        if (this.drawingWire && this.currentWire) {
            this.currentWire.end = { x: pointer.x, y: pointer.y };
            this.drawWires();
        }
    }
    
    finishDrawingWire(pointer) {
        if (!this.drawingWire) return;
        
        const endPin = this.findPinAt(pointer.x, pointer.y);
        
        if (endPin && endPin !== this.startPin && this.isValidConnection(this.startPin, endPin)) {
            // Create permanent wire
            const wire = {
                startPin: this.startPin,
                endPin: endPin,
                start: { x: this.startPin.worldX, y: this.startPin.worldY },
                end: { x: endPin.worldX, y: endPin.worldY },
                color: 0x666666,
                connected: true
            };
            
            this.wires.push(wire);
            
            // Connect pins logically
            this.connectPins(this.startPin, endPin);
            
            console.log('Wire created between pins:', this.startPin, endPin);
        }
        
        // Reset drawing state
        this.drawingWire = false;
        this.currentWire = null;
        this.startPin = null;
        this.drawWires();
    }
    
    findPinAt(x, y) {
        // Search through all placed components for pins
        for (const component of this.scene.placedComponents) {
            const pins = component.getData('pins') || [];
            
            for (const pin of pins) {
                const pinWorldX = component.x + pin.x;
                const pinWorldY = component.y + pin.y;
                const distance = Phaser.Math.Distance.Between(x, y, pinWorldX, pinWorldY);
                if (distance < 15) { // Pin hit radius
                    return {
                        component: component,
                        pin: pin,
                        worldX: pinWorldX,
                        worldY: pinWorldY,
                        type: pin.type,
                        name: pin.name
                    };
                }
            }
        }
        
        // Also check input controls
        if (this.scene.inputControls) {
            const inputComponents = [
                { 
                    component: 'A', 
                    control: this.scene.inputA, 
                    type: 'output', 
                    name: 'A',
                    worldX: this.scene.inputControls.x + this.scene.inputA.x, 
                    worldY: this.scene.inputControls.y + this.scene.inputA.y + 30 
                },
                { 
                    component: 'B', 
                    control: this.scene.inputB, 
                    type: 'output', 
                    name: 'B',
                    worldX: this.scene.inputControls.x + this.scene.inputB.x, 
                    worldY: this.scene.inputControls.y + this.scene.inputB.y + 30 
                },
                { 
                    component: 'Power', 
                    control: this.scene.powerInput, 
                    type: 'output', 
                    name: 'Power',
                    worldX: this.scene.inputControls.x + this.scene.powerInput.x, 
                    worldY: this.scene.inputControls.y + this.scene.powerInput.y + 30 
                }
            ];
            
            for (const input of inputComponents) {
                const distance = Phaser.Math.Distance.Between(x, y, input.worldX, input.worldY);
                if (distance < 15) {
                    return {
                        component: input.component,
                        control: input.control,
                        worldX: input.worldX,
                        worldY: input.worldY,
                        type: input.type,
                        name: input.name
                    };
                }
            }
        }
        
        return null;
    }
    
    isValidConnection(startPin, endPin) {
        // Can't connect two outputs or two inputs
        if (startPin.type === endPin.type) return false;
        
        // Can't connect a pin to its own component
        if (startPin.component === endPin.component) return false;
        
        return true;
    }
    
    connectPins(startPin, endPin) {
        // Determine which is input and which is output
        let outputPin, inputPin;
        if (startPin.type === 'output') {
            outputPin = startPin;
            inputPin = endPin;
        } else {
            outputPin = endPin;
            inputPin = startPin;
        }
        
        // Store connection data
        if (inputPin.component instanceof Phaser.GameObjects.Container) {
            // Logic gate input
            const component = inputPin.component;
            const pinName = inputPin.name;
            
            // Store connection
            const connections = component.getData('connections') || {};
            connections[pinName] = {
                source: outputPin,
                value: this.getPinValue(outputPin)
            };
            component.setData('connections', connections);
            
            // Update pin visual
            const pinGraphic = component.pins && component.pins[pinName];
            if (pinGraphic && pinGraphic.setFillStyle) {
                const value = this.getPinValue(outputPin);
                pinGraphic.setFillStyle(value ? 0x00aa00 : 0x666666);
            }
            
            // Update gate output
            this.updateGateFromInputs(component);
        }
    }
    
    getPinValue(pin) {
        if (typeof pin.component === 'string') {
            // Input control
            return this.scene.inputStates[pin.component] || 0;
        } else if (pin.component instanceof Phaser.GameObjects.Container) {
            // Gate output
            return pin.component.getData('output') || 0;
        }
        return 0;
    }
    
    updateGateFromInputs(component) {
        const connections = component.getData('connections') || {};
        const gateType = component.getData('type');
        
        let inputA = 0, inputB = 0;
        
        if (connections.A) {
            inputA = this.getPinValue(connections.A.source);
        }
        if (connections.B) {
            inputB = this.getPinValue(connections.B.source);
        }
        
        // Calculate output based on gate type
        let output;
        switch(gateType) {
            case 'nand':
                output = !(inputA && inputB) ? 1 : 0;
                break;
            case 'nor':
                output = !(inputA || inputB) ? 1 : 0;
                break;
            case 'xor':
                output = (inputA !== inputB) ? 1 : 0;
                break;
            default:
                output = 0;
        }
        
        // Update output pin
        const outputPin = component.pins && component.pins.C;
        if (outputPin) {
            outputPin.setFillStyle(output ? 0x00aa00 : 0x666666);
            component.setData('output', output);
            
            // Update wire colors
            this.updateWireColors(component);
        }
    }
    
    updateWireColors(component) {
        // Update colors of all wires connected to this component
        for (const wire of this.wires) {
            const startComponent = wire.startPin.component;
            const endComponent = wire.endPin.component;
            
            let state = 0;
            if (startComponent === component || (typeof startComponent === 'string' && component === 'component')) {
                state = this.getPinValue(wire.startPin);
            } else if (endComponent === component || (typeof endComponent === 'string' && component === 'component')) {
                state = this.getPinValue(wire.endPin);
            }
            
            wire.color = state ? 0x00ff00 : 0xff0000;
        }
        
        this.drawWires();
    }
    
    drawWires() {
        this.wireGraphics.clear();
        
        // Draw all permanent wires
        for (const wire of this.wires) {
            this.drawWire(wire);
        }
        
        // Draw temporary wire if drawing
        if (this.drawingWire && this.currentWire) {
            this.drawWire(this.currentWire);
        }
    }
    
    drawWire(wire) {
        this.wireGraphics.lineStyle(4, wire.color, 1);
        
        // Create curved wire using bezier curve
        const controlX1 = wire.start.x + (wire.end.x - wire.start.x) * 0.5;
        const controlY1 = wire.start.y;
        const controlX2 = controlX1;
        const controlY2 = wire.end.y;
        
        // Draw the wire as a curved line
        this.wireGraphics.beginPath();
        this.wireGraphics.moveTo(wire.start.x, wire.start.y);
        
        // Draw straight line for simplicity
        this.wireGraphics.lineTo(wire.end.x, wire.end.y);
        
        this.wireGraphics.strokePath();
        
        // Draw small circles at connection points
        this.wireGraphics.fillStyle(wire.color, 1);
        this.wireGraphics.fillCircle(wire.start.x, wire.start.y, 5);
        this.wireGraphics.fillCircle(wire.end.x, wire.end.y, 5);
    }
    
    removeWiresConnectedTo(component) {
        // Remove all wires connected to a component
        this.wires = this.wires.filter(wire => {
            const startComp = wire.startPin.component;
            const endComp = wire.endPin.component;
            
            if (startComp === component || endComp === component) {
                return false;
            }
            return true;
        });
        
        this.drawWires();
    }
    
    update() {
        // Update wire positions if components moved
        for (const wire of this.wires) {
            // Update start position
            if (typeof wire.startPin.component === 'string') {
                // Input control
                const state = this.scene.inputStates[wire.startPin.component] || 0;
                wire.color = state ? 0x00ff00 : 0xff0000;
                
                // Update connection value if connected to a gate
                if (wire.endPin.component instanceof Phaser.GameObjects.Container) {
                    const connections = wire.endPin.component.getData('connections') || {};
                    const pinName = wire.endPin.name;
                    if (connections[pinName]) {
                        connections[pinName].value = state;
                        wire.endPin.component.setData('connections', connections);
                        this.updateGateFromInputs(wire.endPin.component);
                    }
                }
                
                // Update visual position for input controls
                wire.start.x = wire.startPin.worldX;
                wire.start.y = wire.startPin.worldY;
            } else {
                // Update positions from component
                const component = wire.startPin.component;
                if (component) {
                    const pin = wire.startPin.pin;
                    wire.start.x = component.x + pin.x;
                    wire.start.y = component.y + pin.y;
                    
                    // Update wire color based on output state
                    const outputState = component.getData('output') || 0;
                    wire.color = outputState ? 0x00ff00 : 0xff0000;
                }
            }
            
            // Update end position
            if (wire.endPin.component instanceof Phaser.GameObjects.Container) {
                const component = wire.endPin.component;
                const pin = wire.endPin.pin;
                wire.end.x = component.x + pin.x;
                wire.end.y = component.y + pin.y;
            } else if (typeof wire.endPin.component === 'string') {
                // Input control as end point
                wire.end.x = wire.endPin.worldX;
                wire.end.y = wire.endPin.worldY;
            }
        }
        
        this.drawWires();
    }
    
    reset() {
        this.wires = [];
        this.wireGraphics.clear();
        this.drawingWire = false;
        this.currentWire = null;
        this.startPin = null;
    }
}