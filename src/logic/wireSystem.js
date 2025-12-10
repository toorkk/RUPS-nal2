// logic/wireSystem.js
export class WireSystem {
    constructor(scene) {
        this.scene = scene;
        this.wires = []; // Array of wire objects
        this.drawingWire = false;
        this.currentWire = null;
        this.startPin = null;
        this.wireGraphics = null;
        this.updateInProgress = false; // NEW: Flag to prevent recursive updates
        
        // Wire color definitions
        this.wireColors = {
            default: 0x666666,  // Gray for unconnected/drawing
            high: 0x00ff00,     // Green for logic 1
            low: 0xff0000       // Red for logic 0
        };
        
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
                color: this.wireColors.default,
                connected: false,
                value: 0  // Default value for drawing wire
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
                color: this.getWireColorBasedOnValue(0), // Start with low state
                connected: true,
                value: 0 // Initial value
            };
            
            this.wires.push(wire);
            
            // Connect pins logically
            this.connectPins(this.startPin, endPin);
            
            // Immediately update wire color based on initial state
            this.updateWireValue(wire);
            
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
        if (component.pins) {
            for (const pinName in component.pins) {
                const pin = component.pins[pinName];
                const worldX = component.x + (pin.x || 0);
                const worldY = component.y + (pin.y || 0);
                const distance = Phaser.Math.Distance.Between(x, y, worldX, worldY);
                if (distance < 15) { // Pin hit radius
                    return {
                        component: component,
                        pin: pin,
                        worldX: worldX,
                        worldY: worldY,
                        type: pin.getData('type'),
                        name: pin.getData('name'),
                        signal: pin.getData('signal')
                    };
                }
            }
        }
    }
    
    // Check input controls
    if (this.scene.inputControls) {
        const inputComponents = [this.scene.inputA, this.scene.inputB];
        
        for (const input of inputComponents) {
            if (input && input.connectionArea) {
                const worldX = this.scene.inputControls.x + input.x + 30; // Adjust for circle position
                const worldY = this.scene.inputControls.y + input.y;
                const distance = Phaser.Math.Distance.Between(x, y, worldX, worldY);
                if (distance < 15) {
                    return {
                        component: input.label,
                        control: input,
                        worldX: worldX,
                        worldY: worldY,
                        type: 'output',
                        name: input.label,
                        signal: () => this.scene.inputStates[input.label] || 0
                    };
                }
            }
        }
    }
    
    // Check output pin
    if (this.scene.outputConnectionArea) {
        const worldX = this.scene.outputPinContainer.x;
        const worldY = this.scene.outputPinContainer.y + 30; // Connection circle is at y=30 in container
        const distance = Phaser.Math.Distance.Between(x, y, worldX, worldY);
        if (distance < 25) { // Larger hit radius for output pin
            return {
                component: 'outputPin',
                pin: this.scene.outputConnectionArea,
                worldX: worldX,
                worldY: worldY,
                type: 'input',
                name: 'output',
                signal: () => this.scene.outputState || 0
            };
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
            
            // Get current value from output pin
            const outputValue = this.getPinValue(outputPin);
            
            // Store connection
            const connections = component.getData('connections') || {};
            connections[pinName] = {
                source: outputPin,
                value: outputValue
            };
            component.setData('connections', connections);
            
            // Update pin visual
            const pinGraphic = component.pins && component.pins[pinName];
            if (pinGraphic && pinGraphic.setFillStyle) {
                const color = outputValue ? this.wireColors.high : this.wireColors.low;
                pinGraphic.setFillStyle(color);
            }
            
            // Update gate output
            this.updateGateFromInputs(component);
        } 
        // Handle connection to output pin - FIXED
        else if (inputPin.component === 'outputPin') {
            // Store the connection in the wire system
            // Create a connection object to track this wire's source
            const connection = {
                wire: this.wires[this.wires.length - 1], // The wire just created
                source: outputPin
            };
            
            // Store this connection reference on the wire itself
            const wire = this.wires[this.wires.length - 1];
            if (wire) {
                wire.outputConnection = connection;
                
                // Set initial output value
                const outputValue = this.getPinValue(outputPin);
                this.scene.updateOutputDisplay(outputValue);
                
                // Also update the wire value immediately
                wire.value = outputValue;
                wire.color = this.getWireColorBasedOnValue(outputValue);
            }
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
        // Prevent recursive updates
        if (this.updateInProgress) {
            return;
        }
        
        this.updateInProgress = true;
        
        try {
            const connections = component.getData('connections') || {};
            const gateType = component.getData('type');
            
            let inputA = 0, inputB = 0;
            
            if (connections.A) {
                inputA = this.getPinValue(connections.A.source);
                // Update the A input pin color
                const inputACircle = component.visualPins && component.visualPins.A;
                if (inputACircle && inputACircle.setFillStyle) {
                    const color = inputA ? this.wireColors.high : this.wireColors.low;
                    inputACircle.setFillStyle(color);
                }
            }
            
            if (connections.B) {
                inputB = this.getPinValue(connections.B.source);
                // Update the B input pin color
                const inputBCircle = component.visualPins && component.visualPins.B;
                if (inputBCircle && inputBCircle.setFillStyle) {
                    const color = inputB ? this.wireColors.high : this.wireColors.low;
                    inputBCircle.setFillStyle(color);
                }
            }
            
            // Store input states on the component
            component.inputStates = { A: inputA, B: inputB };
            
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
            
            // Store the previous output value
            const previousOutput = component.getData('output') || 0;
            
            // Only update if the output changed
            if (output !== previousOutput) {
                // Update output pin
                const outputPin = component.pins && component.pins.C;
                const outputVisual = component.visualPins && component.visualPins.C;
                
                if (outputVisual && outputVisual.setFillStyle) {
                    const color = output ? this.wireColors.high : this.wireColors.low;
                    outputVisual.setFillStyle(color);
                }
                
                if (outputPin) {
                    component.setData('output', output);
                    
                    // Update all wires connected to this component's output
                    // Use setTimeout to break the call stack
                    setTimeout(() => {
                        this.updateWiresForComponent(component);
                    }, 0);
                }
            }
        } finally {
            this.updateInProgress = false;
        }
    }
    
    updateWiresForComponent(component) {
    const outputValue = component.getData('output') || 0;
    
    // Find all wires connected to this component's output
    for (const wire of this.wires) {
        const startComp = wire.startPin.component;
        const endComp = wire.endPin.component;
        
        // If wire starts from this component's output
        if (startComp === component && wire.startPin.type === 'output') {
            wire.value = outputValue;
            wire.color = this.getWireColorBasedOnValue(outputValue);
            
            // Update the connected input pin on the other end
            if (endComp instanceof Phaser.GameObjects.Container) {
                this.updateGateFromInputs(endComp);
            }
            // Also check if it's connected to the output pin
            else if (endComp === 'outputPin') {
                this.scene.updateOutputDisplay(outputValue);
            }
        }
    }
    
    this.drawWires();
}
    
    updateWireValue(wire) {
        // Determine which pin is the output (source of value)
        let outputPin, inputPin;
        if (wire.startPin.type === 'output') {
            outputPin = wire.startPin;
            inputPin = wire.endPin;
        } else if (wire.endPin.type === 'output') {
            outputPin = wire.endPin;
            inputPin = wire.startPin;
        }
        
        if (outputPin && inputPin) {
            const value = this.getPinValue(outputPin);
            wire.value = value;
            wire.color = this.getWireColorBasedOnValue(value);
            
            // Update the connected input pin color
            if (inputPin.component instanceof Phaser.GameObjects.Container) {
                const component = inputPin.component;
                const pinName = inputPin.name;
                const pin = component.pins && component.pins[pinName];
                if (pin && pin.setFillStyle) {
                    const color = value ? this.wireColors.high : this.wireColors.low;
                    pin.setFillStyle(color);
                }
            }
            
            return value;
        }
        
        return 0;
    }
    
    getWireColorBasedOnValue(value) {
        return value ? this.wireColors.high : this.wireColors.low;
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
    // Update all wire values and colors
    for (const wire of this.wires) {
        // Update wire positions if components moved
        this.updateWirePositions(wire);
        
        // Update wire value
        const newValue = this.updateWireValue(wire);
        
        // If value changed, update connected gates AND output pin
        if (newValue !== wire.value) {
            wire.value = newValue;
            
            // Determine which pin is the input (receiver of value)
            const inputPin = wire.startPin.type === 'output' ? wire.endPin : wire.startPin;
            
            if (inputPin && inputPin.component instanceof Phaser.GameObjects.Container) {
                this.updateGateFromInputs(inputPin.component);
            }
            
            // Check if this wire is connected to the output pin
            if (wire.endPin && wire.endPin.component === 'outputPin') {
                this.scene.updateOutputDisplay(newValue);
            }
            // Also check if wire starts from output pin (unlikely but just in case)
            else if (wire.startPin && wire.startPin.component === 'outputPin') {
                this.scene.updateOutputDisplay(newValue);
            }
        }
    }
    
    this.drawWires();
}
    
    updateWirePositions(wire) {
        // Update start position
        if (typeof wire.startPin.component === 'string') {
            // Input control
            wire.start.x = wire.startPin.worldX;
            wire.start.y = wire.startPin.worldY;
        } else if (wire.startPin.component) {
            const component = wire.startPin.component;
            const pin = wire.startPin.pin;
            if (component && pin) {
                wire.start.x = component.x + (pin.x || 0);
                wire.start.y = component.y + (pin.y || 0);
            }
        }
        
        // Update end position
        if (typeof wire.endPin.component === 'string') {
            // Input control as end point
            wire.end.x = wire.endPin.worldX;
            wire.end.y = wire.endPin.worldY;
        } else if (wire.endPin.component) {
            const component = wire.endPin.component;
            const pin = wire.endPin.pin;
            if (component && pin) {
                wire.end.x = component.x + (pin.x || 0);
                wire.end.y = component.y + (pin.y || 0);
            }
        }
    }
    
    reset() {
        this.wires = [];
        this.wireGraphics.clear();
        this.drawingWire = false;
        this.currentWire = null;
        this.startPin = null;
        this.updateInProgress = false;
    }
}