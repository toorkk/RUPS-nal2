import Phaser from 'phaser';
import { CircuitGraph } from '../logic/circuitGraph';
import { Node } from '../logic/node';
import { CircuitVisuals } from '../logic/circuitVisuals';
import { WireSystem } from '../logic/wireSystem.js';

export default class LogicScene extends Phaser.Scene {
  constructor() {
    super('LogicScene');
  }

  init() {
    const savedIndex = localStorage.getItem('currentLogicChallengeIndex');
    this.currentChallengeIndex = savedIndex !== null ? parseInt(savedIndex) : 0;

    // Get unlocked gates from localStorage
    const unlockedGates = localStorage.getItem('unlockedLogicGates');
    if (unlockedGates) {
      this.unlockedGates = JSON.parse(unlockedGates);
    } else {
      // Start with NAND gate only
      this.unlockedGates = ['nand'];
      localStorage.setItem('unlockedLogicGates', JSON.stringify(this.unlockedGates));
    }
  }

  preload() {
    this.graph = new CircuitGraph();
  }

  create() {
    const { width, height } = this.cameras.main;

    // Initialize placedComponents BEFORE using it
    this.placedComponents = [];  
    this.gridSize = 40;          

    // Initialize visual modules
    this.circuitVisuals = new CircuitVisuals(this);
    
    // Initialize Wire System 
    this.wireSystem = new WireSystem(this);

    // Background
    const desk = this.add.rectangle(0, 0, width, height, 0xe0c9a6).setOrigin(0);
    
    // Grid
    const gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(1, 0x8b7355, 0.35);
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      gridGraphics.beginPath();
      gridGraphics.moveTo(x, 0);
      gridGraphics.lineTo(x, height);
      gridGraphics.strokePath();
    }
    for (let y = 0; y < height; y += gridSize) {
      gridGraphics.beginPath();
      gridGraphics.moveTo(0, y);
      gridGraphics.lineTo(width, y);
      gridGraphics.strokePath();
    }

    // Info window for component hover
    this.infoWindow = this.add.container(0, 0);
    this.infoWindow.setDepth(1000);
    this.infoWindow.setVisible(false);
    
    const infoBox = this.add.rectangle(0, 0, 200, 80, 0x2c2c2c, 0.95);
    infoBox.setStrokeStyle(2, 0xffffff);
    const infoText = this.add.text(0, 0, '', {
        fontSize: '14px',
        color: '#ffffff',
        align: 'left',
        wordWrap: { width: 180 }
    }).setOrigin(0.5);
    
    this.infoWindow.add([infoBox, infoText]);
    this.infoText = infoText;

    // Logic challenges - only logic gates
    this.logicChallenges = [
      {
        prompt: 'Z uporabo NAND vrat sestavi NOT (INVERT) vrata.',
        challengeType: 'build',
        targetGate: 'not',
        availableGates: ['nand'],
        truthTable: {
          '0': '1',
          '1': '0'
        },
        theory: [
          'NOT (INVERT) ima izhod nasproten vhodu.',
          'Če je vhod 0, je izhod 1.',
          'Če je vhod 1, je izhod 0.',
          'Iz NAND vrat lahko naredimo NOT tako, da povežemo oba vhoda skupaj.'
        ]
      },
      {
        prompt: 'Z uporabo NAND in NOT vrat sestavi AND vrata.',
        challengeType: 'build',
        targetGate: 'and',
        availableGates: ['nand', 'not'],
        truthTable: {
          '00': '0',
          '01': '0',
          '10': '0',
          '11': '1'
        },
        theory: [
          'AND vrata imajo izhod 1 samo takrat, ko sta oba vhoda 1.',
          'AND lahko naredimo iz NAND tako, da dodamo NOT na izhod.',
          'Formula: AND = NOT(NAND)'
        ]
      },
      {
        prompt: 'Z uporabo NAND, NOT in AND vrat sestavi OR vrata.',
        challengeType: 'build',
        targetGate: 'or',
        availableGates: ['nand', 'not', 'and'],
        truthTable: {
          '00': '0',
          '01': '1',
          '10': '1',
          '11': '1'
        },
        theory: [
          'OR vrata imajo izhod 1, če je vsaj en vhod 1.',
          'OR lahko naredimo iz NAND vrat z uporabo De Morganovega zakona.',
          'Formula: OR = NOT(AND(NOT(A), NOT(B)))'
        ]
      },
      {
        prompt: 'Z uporabi NAND, NOT, AND in OR vrat sestavi NOR vrata.',
        challengeType: 'build',
        targetGate: 'nor',
        availableGates: ['nand', 'not', 'and', 'or'],
        truthTable: {
          '00': '1',
          '01': '0',
          '10': '0',
          '11': '0'
        },
        theory: [
          'NOR je NOT-OR, torej OR z invertiranim izhodom.',
          'NOR je univerzalna vrata - iz njih lahko zgradimo vsa ostala vrata.',
          'Formula: NOR = NOT(OR(A, B))'
        ]
      },
      {
        prompt: 'Z uporabo vseh do sedaj odklenjenih vrat sestavi XOR vrata.',
        challengeType: 'build',
        targetGate: 'xor',
        availableGates: ['nand', 'not', 'and', 'or', 'nor'],
        truthTable: {
          '00': '0',
          '01': '1',
          '10': '1',
          '11': '0'
        },
        theory: [
          'XOR (EXCLUSIVE OR) ima izhod 1 samo takrat, ko sta vhoda različna.',
          'XOR je pomemben v računalništvu za seštevanje in kriptografijo.',
          'Formula: XOR = OR(AND(A, NOT(B)), AND(NOT(A), B))'
        ]
      }
    ];

    this.promptText = this.add.text(width / 1.8, height - 30, 
      this.logicChallenges[this.currentChallengeIndex]?.prompt || 'Izberi logično vrata za preizkus', {
      fontSize: '20px',
      color: '#333',
      fontStyle: 'bold',
      backgroundColor: '#ffffff88',
      padding: { x: 15, y: 8 }
    }).setOrigin(0.5);

    this.checkText = this.add.text(width / 2, height - 70, '', {
      fontSize: '18px',
      color: '#cc0000',
      fontStyle: 'bold',
      padding: { x: 15, y: 8 }
    }).setOrigin(0.5);

    // OUTPUT PIN ON THE RIGHT SIDE
    this.createOutputPin(width - 80, height / 2);

    const buttonWidth = 180;
    const buttonHeight = 45;
    const cornerRadius = 10;

    const makeButton = (x, y, label, onClick) => {
      const bg = this.add.graphics();
      bg.fillStyle(0x3399ff, 1);
      bg.fillRoundedRect(x - buttonWidth / 2, y - buttonHeight / 2, buttonWidth, buttonHeight, cornerRadius);

      const text = this.add.text(x, y, label, {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#ffffff'
      }).setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => {
          bg.clear();
          bg.fillStyle(0x0f5cad, 1);
          bg.fillRoundedRect(x - buttonWidth / 2, y - buttonHeight / 2, buttonWidth, buttonHeight, cornerRadius);
        })
        .on('pointerout', () => {
          bg.clear();
          bg.fillStyle(0x3399ff, 1);
          bg.fillRoundedRect(x - buttonWidth / 2, y - buttonHeight / 2, buttonWidth, buttonHeight, cornerRadius);
        })
        .on('pointerdown', onClick);

      return { bg, text };
    };

    // Back button to level selection
    makeButton(width - 140, 25, 'Izbira levela', () => this.scene.start('LevelScene'));
    makeButton(width - 140, 125, 'Preveri', () => this.checkCircuit());
    makeButton(width - 140, 175, 'Ponastavi', () => this.resetCircuit());

    // Side panel for logic gates
    const panelWidth = 150;
    this.add.rectangle(0, 0, panelWidth, height, 0xc0c0c0).setOrigin(0);
    this.add.rectangle(0, 0, panelWidth, height, 0x000000, 0.2).setOrigin(0);

    this.createInputControls();

    this.add.text(panelWidth / 2, 60, 'Logična vrata', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Logic gate buttons in panel
    const logicGates = [
      { type: 'nand', label: 'NAND', color: 0x9933cc },
      { type: 'not', label: 'NOT', color: 0xff9900 },
      { type: 'and', label: 'AND', color: 0x4CAF50 },
      { type: 'or', label: 'OR', color: 0x2196F3 },
      { type: 'nor', label: 'NOR', color: 0xcc3366 },
      { type: 'xor', label: 'XOR', color: 0x3399cc }
    ];

    const startY = 100;
    const spacing = 90;

    logicGates.forEach((gate, index) => {
      const isUnlocked = this.unlockedGates.includes(gate.type);
      this.createLogicGateButton(
        panelWidth / 2,
        startY + index * spacing,
        gate.type,
        gate.label,
        gate.color,
        isUnlocked
      );
    });
    
    // Update wire system in the update loop
    this.events.on('update', () => {
      if (this.wireSystem) {
        this.wireSystem.update();
      }
    });
  }

  createOutputPin(x, y) {
    // Create output pin container
    this.outputPinContainer = this.add.container(x, y);
    
    // Background rectangle
    const bg = this.add.rectangle(0, 0, 100, 120, 0x2c2c2c, 0.8);
    bg.setStrokeStyle(2, 0xffffff);
    
    // Title
    const title = this.add.text(0, -45, 'Izhod', {
      fontSize: '18px',
      color: '#ffffff',
      fontWeight: 'bold'
    }).setOrigin(0.5);
    
    // Value display
    this.outputValueDisplay = this.add.text(0, 0, '0', {
      fontSize: '32px',
      color: '#ff0000',
      fontWeight: 'bold'
    }).setOrigin(0.5);
    
    // Connection circle for wiring
    const connectionCircle = this.add.circle(0, 30, 15, 0x666666)
      .setStrokeStyle(2, 0xffffff);
    const connectionArea = this.add.circle(0, 30, 25, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    
    // Label
    const label = this.add.text(0, 30, 'Izhod', {
      fontSize: '14px',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    // Initialize output state
    this.outputState = 0;
    
    // Setup connection data for wire system
    connectionArea.setData({
      type: 'input',
      name: 'output',
      parent: 'outputPin',
      worldX: x,
      worldY: y + 30,
      signal: () => this.outputState || 0
    });
    
    // Store reference
    this.outputConnectionArea = connectionArea;
    this.outputConnectionCircle = connectionCircle;
    
    // Add hover effect
    connectionArea.on('pointerover', () => {
      connectionCircle.setStrokeStyle(3, 0xffff00);
      connectionCircle.setScale(1.2);
    });
    
    connectionArea.on('pointerout', () => {
      connectionCircle.setStrokeStyle(2, 0xffffff);
      connectionCircle.setScale(1);
    });
    
    this.outputPinContainer.add([bg, title, this.outputValueDisplay, connectionCircle, connectionArea, label]);
  }
  
  updateOutputDisplay(value) {
    this.outputState = value;
    
    // Update visual display
    if (this.outputValueDisplay) {
      this.outputValueDisplay.setText(value.toString());
      this.outputValueDisplay.setColor(value === 1 ? '#00ff00' : '#ff0000');
    }
    
    // Update connection circle color
    if (this.outputConnectionCircle) {
      const color = value ? 0x00ff00 : 0xff0000;
      this.outputConnectionCircle.setFillStyle(color);
    }
  }

  createLogicGateButton(x, y, gateType, label, color, isUnlocked) {
    const button = this.add.container(x, y);
    
    // Button background
    let bg;
    if (isUnlocked) {
      bg = this.add.circle(0, 0, 40, color);
    } else {
      // Locked gate - grayed out
      bg = this.add.circle(0, 0, 40, 0x555555);
      
      // Add lock icon
      const lockIcon = this.add.text(0, 0, '🔒', {
        fontSize: '20px'
      }).setOrigin(0.5);
      button.add(lockIcon);
    }
    
    // Label
    const text = this.add.text(0, 0, label, {
      fontSize: '16px',
      color: isUnlocked ? '#ffffff' : '#888888',
      fontWeight: 'bold'
    }).setOrigin(0.5);
    
    button.add([bg, text]);
    
    if (isUnlocked) {
      button.setInteractive(new Phaser.Geom.Circle(0, 0, 40), Phaser.Geom.Circle.Contains);
      
      button.on('pointerover', () => {
        bg.setScale(1.1);
        const details = this.getLogicGateDetails(gateType);
        this.infoText.setText(details);
        this.infoWindow.x = x + 120;
        this.infoWindow.y = y;
        this.infoWindow.setVisible(true);
      });
      
      button.on('pointerout', () => {
        bg.setScale(1);
        this.infoWindow.setVisible(false);
      });
      
      button.on('pointerdown', () => {
        // Create a new placeable gate
        this.createPlaceableGate(gateType, this.input.activePointer.x, this.input.activePointer.y);
      });
    } else {
      // Show info about when gate will be unlocked
      button.on('pointerover', () => {
        const gateIndex = this.getGateUnlockLevel(gateType);
        this.infoText.setText(`🔒 Odklenjeno na levelu ${gateIndex + 1}\n${this.getGateDescription(gateType)}`);
        this.infoWindow.x = x + 120;
        this.infoWindow.y = y;
        this.infoWindow.setVisible(true);
      });
      
      button.on('pointerout', () => {
        this.infoWindow.setVisible(false);
      });
    }
    
    return button;
  }

//    createPlaceableGate(gateType, x, y) {
//     // Create a draggable gate container
//     const container = this.add.container(x, y);
    
//     // Make it draggable
//     container.setInteractive(new Phaser.Geom.Rectangle(-50, -30, 100, 60), Phaser.Geom.Rectangle.Contains);
//     this.input.setDraggable(container);
    
//     // Enable dragging and update position during drag
//     this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
//       if (gameObject === container) {
//         container.setPosition(dragX, dragY);
//   getGateUnlockLevel(gateType) {
//     const gateOrder = ['nand', 'not', 'and', 'or', 'nor', 'xor'];
//     return gateOrder.indexOf(gateType);
//   }

//   getGateDescription(gateType) {
//     const descriptions = {
//       'nand': 'Osnovna vrata - vedno odklenjena',
//       'not': 'Od NAND narediš NOT tako, da povežeš oba vhoda skupaj',
//       'and': 'Od NAND + NOT narediš AND',
//       'or': 'Od NAND, NOT in AND narediš OR',
//       'nor': 'Od NAND, NOT, AND in OR narediš NOR',
//       'xor': 'Od vseh vrat narediš XOR'
//     };
//     return descriptions[gateType] || '';
//   }


createPlaceableGate(gateType, x, y) {
  // Create a draggable gate container
  const container = this.add.container(x, y);
  
  // Make it draggable
  container.setInteractive(new Phaser.Geom.Rectangle(-50, -30, 100, 60), Phaser.Geom.Rectangle.Contains);
  this.input.setDraggable(container);
  
  // Enable dragging and update position during drag
  this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
    if (gameObject === container) {
      container.setPosition(dragX, dragY);
    }
  });
  
  // Snap to grid on drag end
  container.on('dragend', (pointer) => {
    const snapX = Math.round(pointer.x / this.gridSize) * this.gridSize;
    const snapY = Math.round(pointer.y / this.gridSize) * this.gridSize;
    container.setPosition(snapX, snapY);
  });
  
  // Different visuals based on gate type
  const graphics = this.add.graphics();
  
  // Initialize inputStates here
  container.inputStates = { A: 0, B: 0 };
  
  switch(gateType) {
    case 'nand':
      // Draw NAND gate
      graphics.fillStyle(0xffffff, 1);
      graphics.lineStyle(3, 0x000000, 1);
      graphics.fillRoundedRect(-50, -30, 100, 60, 12);
      graphics.strokeRoundedRect(-50, -30, 100, 60, 12);
      graphics.strokeCircle(55, 0, 6);
      
      const nandLabel = this.add.text(0, 0, 'NAND', {
        fontSize: '14px',
        color: '#000000',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      
      container.add([graphics, nandLabel]);
      this.addGatePins(container, gateType);
      break;
      
    case 'nor':
      // Draw NOR gate
      graphics.lineStyle(3, 0x000000, 1);
      graphics.fillStyle(0xffffff, 1);
      
      graphics.beginPath();
      graphics.moveTo(-35, -45);
      graphics.lineTo(45, 0);
      graphics.lineTo(-35, 45);
      graphics.closePath();
      graphics.fillPath();
      graphics.strokePath();
      graphics.strokeCircle(55, 0, 6);
      
      const norLabel = this.add.text(0, 0, 'NOR', {
        fontSize: '14px',
        color: '#000000',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      
      container.add([graphics, norLabel]);
      this.addGatePins(container, gateType);
      break;
      
    case 'xor':
      // Draw XOR gate
      graphics.lineStyle(3, 0x000000, 1);
      graphics.fillStyle(0xffffff, 1);
      
      // XOR curved part
      graphics.beginPath();
      graphics.arc(-65, 0, 25, -Math.PI / 2, Math.PI / 2, false);
      graphics.strokePath();
      
      // XOR triangle
      graphics.beginPath();
      graphics.moveTo(-35, -45);
      graphics.lineTo(45, 0);
      graphics.lineTo(-35, 45);
      graphics.closePath();
      graphics.fillPath();
      graphics.strokePath();
      
      const xorLabel = this.add.text(0, 0, 'XOR', {
        fontSize: '14px',
        color: '#000000',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      
      container.add([graphics, xorLabel]);
      this.addGatePins(container, gateType);
      break;

    case 'not':
      // Draw NOT gate
      graphics.lineStyle(3, 0x000000, 1);
      graphics.fillStyle(0xffffff, 1);
      
      // NOT triangle
      graphics.beginPath();
      graphics.moveTo(-50, -30);
      graphics.lineTo(50, 0);
      graphics.lineTo(-50, 30);
      graphics.closePath();
      graphics.fillPath();
      graphics.strokePath();
      graphics.strokeCircle(60, 0, 6);
      
      const notLabel = this.add.text(0, 0, 'NOT', {
        fontSize: '14px',
        color: '#000000',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      
      container.add([graphics, notLabel]);
      this.addGatePins(container, gateType);
      break;

    case 'and':
      // Draw AND gate
      graphics.lineStyle(3, 0x000000, 1);
      graphics.fillStyle(0xffffff, 1);
      
      graphics.fillRoundedRect(-50, -30, 100, 60, 12);
      graphics.strokeRoundedRect(-50, -30, 100, 60, 12);
      
      const andLabel = this.add.text(0, 0, 'AND', {
        fontSize: '14px',
        color: '#000000',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      
      container.add([graphics, andLabel]);
      this.addGatePins(container, gateType);
      break;

    case 'or':
      // Draw OR gate
      graphics.lineStyle(3, 0x000000, 1);
      graphics.fillStyle(0xffffff, 1);
      
      graphics.beginPath();
      graphics.moveTo(-35, -45);
      graphics.lineTo(45, 0);
      graphics.lineTo(-35, 45);
      graphics.closePath();
      graphics.fillPath();
      graphics.strokePath();
      
      const orLabel = this.add.text(0, 0, 'OR', {
        fontSize: '14px',
        color: '#000000',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      
      container.add([graphics, orLabel]);
      this.addGatePins(container, gateType);
      break;
  }
  
  // Add pin data for wire connections
  const pins = this.getGatePins(gateType);
  container.setData('pins', pins);
  container.setData('type', gateType);
  container.setData('output', 0); // Initialize output
  container.setData('connections', {}); // Initialize connections
  
  container.setData('logicComponent', {
    reset: () => {
      // Reset logic if needed
      if (container.inputPins) {
        container.inputPins.forEach(pin => pin.setFillStyle(0x666666));
      }
      if (container.outputPin) {
        container.outputPin.setFillStyle(0x666666);
      }
      container.inputStates = { A: 0, B: 0 };
      container.setData('output', 0);
      container.setData('connections', {});
    },
    updateInputs: (inputs) => {
      // Update gate inputs if needed
      if (container.inputStates) {
        container.inputStates.A = inputs.A || 0;
        container.inputStates.B = inputs.B || 0;
        this.updateGateOutput(container, gateType);
      }
    }
  });
  
  // CRITICAL: Push to placedComponents array so wire system can track it
  this.placedComponents.push(container);
  return container;
}


  getGatePins(gateType) {
  // Return pin configuration for the gate
  if (gateType === 'not') {
    return [
      { x: -65, y: 0, type: 'input', name: 'A' },
      { x: 65, y: 0, type: 'output', name: 'C' }
    ];
  } else {
    return [
      { x: -65, y: -12, type: 'input', name: 'A' },
      { x: -65, y: 12, type: 'input', name: 'B' },
      { x: 75, y: 0, type: 'output', name: 'C' }
    ];
  }
}

addGatePins(container, gateType) {
  const pinRadius = 8;
  const connectionRadius = 15;
  
  if (!container.inputStates) {
    container.inputStates = { A: 0, B: 0 };
  }
  
  // For NOT gate (single input)
  if (gateType === 'not') {
    // Input pin A
    const inputACircle = this.add.circle(-65, 0, pinRadius, 0x666666)
      .setStrokeStyle(2, 0x000000);
    const inputA = this.add.circle(-65, 0, connectionRadius, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    
    inputA.setData({
      type: 'input',
      name: 'A',
      parent: container,
      signal: () => container.inputStates.A || 0
    });
    
    const labelA = this.add.text(-80, 0, 'A', {
      fontSize: '14px',
      color: '#000000'
    }).setOrigin(0.5);
    
    // Output pin C
    const outputCCircle = this.add.circle(65, 0, pinRadius, 0x666666)
      .setStrokeStyle(2, 0x000000);
    const outputC = this.add.circle(65, 0, connectionRadius, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    
    outputC.setData({
      type: 'output',
      name: 'C',
      parent: container,
      signal: () => container.getData('output') || 0
    });
    
    const labelC = this.add.text(82, 0, 'C', {
      fontSize: '14px',
      color: '#000000'
    }).setOrigin(0.5);
    
    // Store references
    container.inputCircles = { A: inputACircle };
    container.outputCircle = outputCCircle;
    container.inputPins = [inputA];
    container.outputPin = outputC;
    
    if (!container.pins) container.pins = {};
    container.pins.A = inputA;
    container.pins.C = outputC;
    
    container.visualPins = {
      A: inputACircle,
      C: outputCCircle
    };
    
    container.add([inputACircle, inputA, labelA, outputCCircle, outputC, labelC]);
    
  } else {
    // For all other gates (two inputs)
    // Input pin A
    const inputACircle = this.add.circle(-65, -12, pinRadius, 0x666666)
      .setStrokeStyle(2, 0x000000);
    const inputA = this.add.circle(-65, -12, connectionRadius, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    
    inputA.setData({
      type: 'input',
      name: 'A',
      parent: container,
      signal: () => container.inputStates.A || 0
    });
    
    const labelA = this.add.text(-80, -12, 'A', {
      fontSize: '14px',
      color: '#000000'
    }).setOrigin(0.5);
    
    // Input pin B
    const inputBCircle = this.add.circle(-65, 12, pinRadius, 0x666666)
      .setStrokeStyle(2, 0x000000);
    const inputB = this.add.circle(-65, 12, connectionRadius, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    
    inputB.setData({
      type: 'input',
      name: 'B',
      parent: container,
      signal: () => container.inputStates.B || 0
    });
    
    const labelB = this.add.text(-80, 12, 'B', {
      fontSize: '14px',
      color: '#000000'
    }).setOrigin(0.5);
    
    // Output pin C
    const outputCCircle = this.add.circle(75, 0, pinRadius, 0x666666)
      .setStrokeStyle(2, 0x000000);
    const outputC = this.add.circle(75, 0, connectionRadius, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    
    outputC.setData({
      type: 'output',
      name: 'C',
      parent: container,
      signal: () => container.getData('output') || 0
    });
    
    const labelC = this.add.text(92, 0, 'C', {
      fontSize: '14px',
      color: '#000000'
    }).setOrigin(0.5);
    
    // Store references
    container.inputCircles = { A: inputACircle, B: inputBCircle };
    container.outputCircle = outputCCircle;
    container.inputPins = [inputA, inputB];
    container.outputPin = outputC;
    
    if (!container.pins) container.pins = {};
    container.pins.A = inputA;
    container.pins.B = inputB;
    container.pins.C = outputC;
    
    container.visualPins = {
      A: inputACircle,
      B: inputBCircle,
      C: outputCCircle
    };
    
    container.add([inputACircle, inputA, labelA, inputBCircle, inputB, labelB, 
                   outputCCircle, outputC, labelC]);
  }
  
  // Add hover effects
  const allInteractivePins = gateType === 'not' ? 
    [container.pins.A, container.pins.C] : 
    [container.pins.A, container.pins.B, container.pins.C];
    
  allInteractivePins.forEach(pin => {
    if (pin) {
      pin.on('pointerover', () => {
        const visualPin = container.visualPins[pin.getData('name')];
        if (visualPin) {
          visualPin.setStrokeStyle(3, 0xffff00);
          visualPin.setScale(1.2);
        }
      });
      
      pin.on('pointerout', () => {
        const visualPin = container.visualPins[pin.getData('name')];
        if (visualPin) {
          visualPin.setStrokeStyle(2, 0x000000);
          visualPin.setScale(1);
        }
      });
    }
  });
}


updateGateOutput(container, gateType) {
  // Check if container has inputStates
  if (!container.inputStates) {
    container.inputStates = { A: 0, B: 0 };
  }
  
  const { A = 0, B = 0 } = container.inputStates;
  let output;
  
  switch(gateType) {
    case 'nand':
      output = !(A && B) ? 1 : 0;
      break;
    case 'nor':
      output = !(A || B) ? 1 : 0;
      break;
    case 'xor':
      output = (A !== B) ? 1 : 0;
      break;
    case 'not':
      output = !A ? 1 : 0;
      break;
    case 'and':
      output = (A && B) ? 1 : 0;
      break;
    case 'or':
      output = (A || B) ? 1 : 0;
      break;
    default:
      output = 0;
  }
  
  // Update output circle color
  if (container.outputCircle) {
    const color = output ? 0x00ff00 : 0xff0000;
    container.outputCircle.setFillStyle(color);
  }
  
  // Also update the visual pin if stored separately
  if (container.visualPins && container.visualPins.C) {
    const color = output ? 0x00ff00 : 0xff0000;
    container.visualPins.C.setFillStyle(color);
  }
  
  // Update pin data signal
  if (container.outputPin) {
    container.outputPin.setData('signal', () => output);
  }
  
  container.setData('output', output);
  
  // Update wire colors if wire system exists
  if (this.wireSystem) {
    this.wireSystem.updateWiresForComponent(container);
  }
}

  getLogicGateDetails(gateType) {
    const details = {
      'nand': 'NAND (NOT-AND)\nIzhod: 0 samo, ko sta oba vhoda 1\nOsnovna vrata',
      'not': 'NOT (INVERT)\nIzhod: nasproten vhodu\n0 → 1, 1 → 0\nOd NAND: poveži oba vhoda skupaj',
      'and': 'AND\nIzhod: 1 samo, ko sta oba vhoda 1\nOd NAND + NOT: AND = NOT(NAND)',
      'or': 'OR\nIzhod: 1, če je vsaj en vhod 1\nOd NAND, NOT, AND: OR = NOT(AND(NOT(A), NOT(B)))',
      'nor': 'NOR (NOT-OR)\nIzhod: 1 samo, ko sta oba vhoda 0\nOd OR + NOT: NOR = NOT(OR)',
      'xor': 'XOR (EXCLUSIVE OR)\nIzhod: 1 samo, ko sta vhoda različna\nOd vseh vrat: XOR = OR(AND(A, NOT(B)), AND(NOT(A), B))'
    };
    return details[gateType] || 'Logična vrata';
  }

  createInputControls() {
    const panelWidth = 150;
    const { height } = this.cameras.main;
    
    // Create input controls container
    this.inputControls = this.add.container(panelWidth + 20, 100);
    
    // Initialize input states
    this.inputStates = {
        A: 0,
        B: 0,
    };
    
    // Create A input
    this.inputA = this.createToggleInput('A', 0, 0);
    
    // Create B input
    this.inputB = this.createToggleInput('B', 0, 80);
    
    // Add all to container
    this.inputControls.add([this.inputA, this.inputB]);
    
    // Update visual states immediately
    this.updateInputVisuals();
  }

createToggleInput(label, x, y) {
  const container = this.add.container(x, y);
  
  // Background rectangle
  const bg = this.add.rectangle(0, 0, 60, 60, 0x666666);
  bg.setStrokeStyle(2, 0x000000);
  
  // Label text
  const labelText = this.add.text(0, -30, label, {
    fontSize: '18px',
    color: '#000000',
    fontWeight: 'bold'
  }).setOrigin(0.5);
  
  // Value display - default 0
  const valueDisplay = this.add.text(0, 0, '0', {
    fontSize: '24px',
    color: '#ff0000',
    fontWeight: 'bold'
  }).setOrigin(0.5);
  
  // Connection circle for wiring
  const connectionCircle = this.add.circle(30, 0, 8, 0xffffff)
    .setStrokeStyle(2, 0x000000);
  const connectionArea = this.add.circle(30, 0, 15, 0x000000, 0)
    .setInteractive({ useHandCursor: true });
  
  // Store connection data
  connectionArea.setData({
    type: 'output',
    name: label,
    parent: 'inputControl',
    signal: () => this.inputStates[label] || 0
  });
  
  // Add hover effect
  connectionArea.on('pointerover', () => {
    connectionCircle.setStrokeStyle(3, 0xffff00);
    connectionCircle.setScale(1.2);
  });
  
  connectionArea.on('pointerout', () => {
    connectionCircle.setStrokeStyle(2, 0x000000);
    connectionCircle.setScale(1);
  });
  
  // Store references
  container.bg = bg;
  container.valueDisplay = valueDisplay;
  container.connectionCircle = connectionCircle;
  container.connectionArea = connectionArea;
  container.label = label;
  
  // Make the background interactive for toggling
  bg.setInteractive({ useHandCursor: true });
  
  // Pointer events
  bg.on('pointerover', () => {
    const currentState = this.inputStates[label];
    if (currentState === 0) {
      bg.setFillStyle(0x888888); // Gray on hover when off
    }
  });
  
  bg.on('pointerdown', (pointer) => {
    // Prevent triggering wire drawing when clicking on inputs
    pointer.event.stopPropagation();
    this.toggleInput(label);
  });
  
  container.add([bg, labelText, valueDisplay, connectionCircle, connectionArea]);
  return container;
}

  createPowerInput(label, x, y) {
    const container = this.add.container(x, y);
    
    // Background rectangle - always green
    const bg = this.add.rectangle(0, 0, 60, 60, 0x006600);
    bg.setStrokeStyle(2, 0x000000);
    
    // Label text
    const labelText = this.add.text(0, -30, label, {
        fontSize: '18px',
        color: '#000000',
        fontWeight: 'bold'
    }).setOrigin(0.5);
    
    // Value display - always 1 and green
    const valueDisplay = this.add.text(0, 0, '1', {
        fontSize: '24px',
        color: '#00ff00',
        fontWeight: 'bold'
    }).setOrigin(0.5);
    
    // Store references
    container.bg = bg;
    container.valueDisplay = valueDisplay;
    container.label = label;
    
    // Power is NOT interactive - no pointer events
    
    container.add([bg, labelText, valueDisplay]);
    return container;
  }


    
toggleInput(inputName) {
    console.log(`Toggling ${inputName} from ${this.inputStates[inputName]} to ${this.inputStates[inputName] === 0 ? 1 : 0}`);
    
    this.inputStates[inputName] = this.inputStates[inputName] === 0 ? 1 : 0;

    // Update visuals
    this.updateInputVisuals();
    
    // Update all placed components with new input values
    this.updateCircuitInputs();
    
    // Update wire colors AND propagate signals
    if (this.wireSystem) {
        // First update all gates
        this.placedComponents.forEach(component => {
            const connections = component.getData('connections') || {};
            
            // Check if this component is connected to the toggled input
            let needsUpdate = false;
            for (const pin in connections) {
                const conn = connections[pin];
                if (conn.source && 
                    ((typeof conn.source.component === 'string' && conn.source.component === inputName) ||
                     (conn.source.component && conn.source.component.label === inputName))) {
                    needsUpdate = true;
                    break;
                }
            }
            
            if (needsUpdate) {
                this.wireSystem.updateGateFromInputs(component);
            }
        });
        
        // Then update wires
        this.wireSystem.update();
    }
}

updateInputVisuals() {
  // Update A input
  if (this.inputA && this.inputA.valueDisplay) {
    const aState = this.inputStates.A;
    this.inputA.valueDisplay.setText(aState.toString());
    this.inputA.valueDisplay.setColor(aState === 1 ? '#00ff00' : '#ff0000');
    this.inputA.bg.setFillStyle(aState === 1 ? 0x006600 : 0x666666);
    
    // Update connection circle color
    if (this.inputA.connectionCircle) {
      this.inputA.connectionCircle.setFillStyle(aState === 1 ? 0x00ff00 : 0xff0000);
    }
  }
  
  // Update B input
  if (this.inputB && this.inputB.valueDisplay) {
    const bState = this.inputStates.B;
    this.inputB.valueDisplay.setText(bState.toString());
    this.inputB.valueDisplay.setColor(bState === 1 ? '#00ff00' : '#ff0000');
    this.inputB.bg.setFillStyle(bState === 1 ? 0x006600 : 0x666666);
    
    // Update connection circle color
    if (this.inputB.connectionCircle) {
      this.inputB.connectionCircle.setFillStyle(bState === 1 ? 0x00ff00 : 0xff0000);
    }
  }
}

  updateCircuitInputs() {
    // Update all placed logic components with current input values
    this.placedComponents.forEach(component => {
      const logicComp = component.getData('logicComponent');
      if (logicComp && logicComp.updateInputs) {
        logicComp.updateInputs({
          A: this.inputStates.A,
          B: this.inputStates.B,
          power: this.inputStates.Power
        });
      }
      
      // Update gate output based on new inputs
      const gateType = component.getData('type');
      if (gateType) {
        this.updateGateOutput(component, gateType);
      }
        // Also update any visual connections/wires
    // if (this.circuitVisuals) {
    //         this.circuitVisuals.updateWiresForComponent(component);
    //     }
    });
    
    console.log(`Circuit updated: A=${this.inputStates.A}, B=${this.inputStates.B}`);
    }





 updateInputs(inputs) {
    // Update gate state based on inputs
    this.inputA = inputs.A;
    this.inputB = inputs.B;
    
    // Calculate output based on NAND logic
    this.output = this.powered ? (this.inputA && this.inputB ? 0 : 1) : 0;
    
    // Update visual state
    this.updateVisualState();
}

updateVisualState() {
    // Update the visual representation
    if (this.output === 1) {
        // Visual for output 1 (green, glowing, etc.)
        this.setTint(0x00ff00);
    } else {
        // Visual for output 0 (red, dim, etc.)
        this.setTint(0xff0000);
    }
}

  checkCircuit() {
    const currentChallenge = this.logicChallenges[this.currentChallengeIndex];
    if (!currentChallenge) {
      this.checkText.setText('Najprej izberi izziv');
      return;
    }

    if (currentChallenge.challengeType === 'build') {
        console.log('Starting simple circuit verification...');
        
        // Show checking message
        this.checkText.setStyle({ color: '#ffff00' });
        this.checkText.setText('Preverjam vezje...');
        
        // Give a small delay for visual feedback
        this.time.delayedCall(500, () => {
            const isCorrect = this.verifyBuiltCircuit(currentChallenge);
            
            if (isCorrect) {
                this.checkText.setStyle({ color: '#00aa00' });
                this.checkText.setText('Pravilno! Vezje je pravilno sestavljeno.');
                
                // Add some celebratory effects
                this.addCelebrationEffects();
                
                // Unlock next gate if available
                this.unlockNextGate();
                
                // Save progress
                this.saveProgress();
                
                // Add points
                this.addPoints(10);
                
                // Check if there's a next level
                const nextLevelIndex = this.currentChallengeIndex + 1;
                const hasNextLevel = nextLevelIndex < this.logicChallenges.length;
                
                // Show theory with next level button
                if (currentChallenge.theory) {
                    // Delay theory popup so user sees success message first
                    this.time.delayedCall(1000, () => {
                        this.showTheory(currentChallenge.theory);
                    });
                } else if (hasNextLevel) {
                    // Auto-advance after delay
                    this.time.delayedCall(2000, () => {
                        this.goToNextLevel(nextLevelIndex);
                    });
                } else {
                    // Last level completed
                    this.time.delayedCall(2000, () => {
                        this.checkText.setText('Čestitke! Zaključil si vse logične izzive!');
                        
                        // Optionally go back to level selection
                        this.time.delayedCall(3000, () => {
                            this.scene.start('LevelScene');
                        });
                    });
                }
            } else {
                // Error message already set by verifyBuiltCircuit
                this.checkText.setStyle({ color: '#cc0000' });
                // Add some error highlighting
                this.highlightErrors();
            }
        });
    } else {
        // Original exploration mode
        this.checkText.setStyle({ color: '#00aa00' });
        this.checkText.setText('Pravilno! Preuči delovanje vrat.');
        this.addPoints(5);
        
        if (currentChallenge.theory) {
            this.showTheory(currentChallenge.theory);
        }
    }
}

addCelebrationEffects() {
    // Add some particle effects or animations for success
    const { width, height } = this.cameras.main;
    
    // Create success particles
    for (let i = 0; i < 20; i++) {
        const x = Phaser.Math.Between(100, width - 100);
        const y = Phaser.Math.Between(100, height - 100);
        
        const particle = this.add.circle(x, y, 5, 0x00ff00);
        
        this.tweens.add({
            targets: particle,
            y: y - 100,
            alpha: 0,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => particle.destroy()
        });
    }
    
    // Flash the output pin green
    if (this.outputPinContainer) {
        this.tweens.add({
            targets: this.outputPinContainer,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 300,
            yoyo: true,
            repeat: 3
        });
    }
}

highlightErrors() {
    // Highlight gates with missing connections
    for (const component of this.placedComponents) {
        const gateType = component.getData('type');
        const connections = component.getData('connections') || {};
        
        let hasError = false;
        
        if (gateType === 'not') {
            hasError = !connections.A;
        } else {
            hasError = !connections.A || !connections.B;
        }
        
        if (hasError) {
            // Flash the gate red
            this.tweens.add({
                targets: component,
                alpha: 0.5,
                duration: 300,
                yoyo: true,
                repeat: 2
            });
        }
    }
    
    // Highlight output pin if not connected
    if (!this.checkOutputConnection() && this.outputPinContainer) {
        this.tweens.add({
            targets: this.outputPinContainer,
            tint: 0xff0000,
            duration: 300,
            yoyo: true,
            repeat: 2
        });
    }
}

getRequiredGateCount(targetGate) {
    // Simple minimum gate counts for each challenge
    const requirements = {
        'not': { min: 1, max: 1, description: '1 NAND vrata' },
        'and': { min: 2, max: 2, description: 'NAND + NOT' },
        'or': { min: 3, max: 5, description: 'NAND, NOT, AND' },
        'nor': { min: 2, max: 4, description: 'OR + NOT' },
        'xor': { min: 4, max: 8, description: 'Več vrat' }
    };
    
    return requirements[targetGate] || { min: 1, max: 10 };
}

  verifyBuiltCircuit(challenge) {
    console.log('Verifying circuit for:', challenge.targetGate);
    
    const { targetGate } = challenge;

    // Get gate count requirements
    const requirements = this.getRequiredGateCount(targetGate);
    const gateCount = this.placedComponents.length;

    if (gateCount < requirements.min) {
        this.checkText.setText(`Premalo vrat. Potrebuješ ${requirements.description}.`);
        return false;
    }

    if (gateCount > requirements.max) {
        this.checkText.setText(`Preveč vrat. Uporabi samo ${requirements.max} vrata.`);
        return false;
    }
    
    // FOR NOT GATE CHALLENGE (Level 1)
    if (targetGate === 'not') {
        // Should have exactly 1 NAND gate
        if (this.placedComponents.length !== 1) {
            this.checkText.setText('Uporabi samo 1 NAND vrata za gradnjo NOT.');
            return false;
        }
        
        const gate = this.placedComponents[0];
        const gateType = gate.getData('type');
        
        if (gateType !== 'nand') {
            this.checkText.setText('Uporabi NAND vrata za gradnjo NOT.');
            return false;
        }
        
        // Check connections
        const connections = gate.getData('connections') || {};
        
        // BOTH inputs (A and B) must be connected
        if (!connections.A || !connections.B) {
            this.checkText.setText('Za gradnjo NOT vrat moraš povezati OBA vhoda NAND vrat.');
            return false;
        }
        
        // Check output connection
        if (!this.checkOutputConnection()) {
            this.checkText.setText('Izhod ni povezan. Poveži izhod NAND vrat na izhodni pin (desno).');
            return false;
        }
        
        // TEST FUNCTIONALITY - This is the most important check
        return this.testNotGateFunctionality();
    }
    
    // For AND gate challenge
    if (targetGate === 'and') {
        // Check output connection
        if (!this.checkOutputConnection()) {
            this.checkText.setText('Izhod ni povezan. Poveži izhod na izhodni pin (desno).');
            return false;
        }
        
        // Check if all gates have their inputs connected
        const allGatesConnected = this.checkAllGatesConnected();
        if (!allGatesConnected) {
            this.checkText.setText('Nekatera vrata niso pravilno povezana.');
            return false;
        }
        
        // Check gate types
        const gateTypes = this.placedComponents.map(comp => comp.getData('type'));
        
        // Should have NAND and NOT gates
        const hasNand = gateTypes.includes('nand');
        const hasNot = gateTypes.includes('not');
        if (!hasNand || !hasNot) {
            this.checkText.setText('AND potrebuje NAND in NOT vrata.');
            return false;
        }
        
        return this.testAndGateFunctionality();
    }
    if (gateCount < requirements.min) {
    this.checkText.setText(`Premalo vrat. Potrebuješ ${requirements.description}.`);
    return false;
    }

    if (gateCount > requirements.max) {
        this.checkText.setText(`Preveč vrat. Uporabi samo ${requirements.max} vrata.`);
        return false;
    }
    
    // SIMPLE CHECK 1: Are there any gates placed?
    if (this.placedComponents.length === 0) {
        this.checkText.setText('Dodaj vsaj ena logična vrata.');
        return false;
    }
    
    // SIMPLE CHECK 2: Check output connection
    if (!this.checkOutputConnection()) {
        this.checkText.setText('Izhod ni povezan. Poveži izhod na izhodni pin (desno).');
        return false;
    }
    
    // SIMPLE CHECK 3: Check if all gates have their inputs connected
    const allGatesConnected = this.checkAllGatesConnected();
    if (!allGatesConnected) {
        this.checkText.setText('Nekatera vrata niso pravilno povezana.');
        return false;
    }
    
    // SIMPLE CHECK 4: Check gate types (optional - for basic validation)
    const gateTypes = this.placedComponents.map(comp => comp.getData('type'));
    console.log('Placed gate types:', gateTypes);
    
    // For NOT gate challenge (first level)
    if (targetGate === 'not') {
        // Should have at least 1 NAND gate
        const hasNand = gateTypes.includes('nand');
        if (!hasNand) {
            this.checkText.setText('Uporabi NAND vrata za gradnjo NOT.');
            return false;
        }
    }
    
    // For AND gate challenge (second level)
    if (targetGate === 'and') {
        // Should have at least NAND and NOT gates
        const hasNand = gateTypes.includes('nand');
        const hasNot = gateTypes.includes('not');
        if (!hasNand || !hasNot) {
            this.checkText.setText('AND potrebuje NAND in NOT vrata.');
            return false;
        }
    }
    
    // If we get here, the circuit structure looks good
    return true;
}

testAndGateFunctionality() {
    console.log('Testing AND gate functionality...');
    
    // Save current states
    const savedA = this.inputStates.A;
    const savedB = this.inputStates.B;
    
    let passedTests = 0;
    const totalTests = 4;
    
    // Test all 4 input combinations
    const testCases = [
        { A: 0, B: 0, expected: 0 },
        { A: 0, B: 1, expected: 0 },
        { A: 1, B: 0, expected: 0 },
        { A: 1, B: 1, expected: 1 }
    ];
    
    const runTest = (index) => {
        if (index >= testCases.length) {
            // All tests done
            console.log(`AND gate test: ${passedTests}/${totalTests} passed`);
            
            // Restore original states
            this.inputStates.A = savedA;
            this.inputStates.B = savedB;
            this.updateInputVisuals();
            this.updateCircuitInputs();
            
            if (this.wireSystem) {
                this.placedComponents.forEach(component => {
                    this.wireSystem.updateGateFromInputs(component);
                });
                this.wireSystem.update();
            }
            
            return passedTests === totalTests;
        }
        
        const testCase = testCases[index];
        this.inputStates.A = testCase.A;
        this.inputStates.B = testCase.B;
        this.updateInputVisuals();
        this.updateCircuitInputs();
        
        if (this.wireSystem) {
            this.placedComponents.forEach(component => {
                this.wireSystem.updateGateFromInputs(component);
            });
            this.wireSystem.update();
        }
        
        // Wait for signals to propagate
        this.time.delayedCall(100, () => {
            if (this.outputState === testCase.expected) {
                console.log(`Test ${index + 1} PASSED: A=${testCase.A}, B=${testCase.B} -> Output=${this.outputState}`);
                passedTests++;
            } else {
                console.log(`Test ${index + 1} FAILED: A=${testCase.A}, B=${testCase.B} -> Expected ${testCase.expected}, got ${this.outputState}`);
            }
            
            // Run next test
            runTest(index + 1);
        });
    };
    
    // Start testing
    runTest(0);
    
    // Return true for now, actual result will be determined in callback
    return true;
}

testNotGateFunctionality() {
    console.log('Testing NOT gate functionality...');
    
    let allTestsPassed = true;
    
    // Test input 0 -> output 1
    this.inputStates.A = 0;
    this.inputStates.B = 0;
    this.updateInputVisuals();
    this.propagateAllSignals();
    
    // Give time for signals to propagate
    setTimeout(() => {
        if (this.outputState !== 1) {
            console.log(`FAILED: Input 0,0 -> Expected 1, got ${this.outputState}`);
            allTestsPassed = false;
        } else {
            console.log('PASSED: Input 0,0 -> Output 1');
        }
        
        // Test input 1 -> output 0
        this.inputStates.A = 1;
        this.inputStates.B = 1;
        this.updateInputVisuals();
        this.propagateAllSignals();
        
        setTimeout(() => {
            if (this.outputState !== 0) {
                console.log(`FAILED: Input 1,1 -> Expected 0, got ${this.outputState}`);
                allTestsPassed = false;
            } else {
                console.log('PASSED: Input 1,1 -> Output 0');
            }
            
            // Reset
            this.inputStates.A = 0;
            this.inputStates.B = 0;
            this.updateInputVisuals();
            this.propagateAllSignals();
            
            console.log(`NOT gate test ${allTestsPassed ? 'PASSED' : 'FAILED'}`);
            
            // Update the check text based on result
            if (!allTestsPassed) {
                this.checkText.setText('Vezje ne deluje kot NOT vrata. Preveri povezave.');
            }
        }, 100);
    }, 100);
    
    return allTestsPassed;
}

checkOutputConnection() {
    // Check if any wire connects to the output pin
    if (!this.wireSystem || !this.wireSystem.wires) {
        console.log('No wire system or wires found');
        return false;
    }
    
    for (const wire of this.wireSystem.wires) {
        const startComp = wire.startPin?.component;
        const endComp = wire.endPin?.component;
        
        console.log('Checking wire:', { startComp, endComp });
        
        if (startComp === 'outputPin' || endComp === 'outputPin') {
            console.log('Output connection found!');
            return true;
        }
    }
    
    console.log('No output connection found');
    return false;
}

checkAllGatesConnected() {
    // Simple check: ensure all gates have their pins connected
    for (const component of this.placedComponents) {
        const gateType = component.getData('type');
        const connections = component.getData('connections') || {};
        
        console.log(`Checking ${gateType} gate connections:`, connections);
        
        if (gateType === 'not') {
            // NOT gate needs ONLY 1 input connection (A)
            if (!connections.A) {
                console.log(`NOT gate missing input connection`);
                return false;
            }
        } else if (gateType === 'nand' && this.currentChallengeIndex === 0) {
            // For NOT gate challenge (level 1), NAND needs BOTH inputs connected
            if (!connections.A || !connections.B) {
                this.checkText.setText('Za NOT vrata poveži OBA vhoda NAND vrat na isti vhodni signal!');
                return false;
            }
        } else {
            // All other gates (and, or, nor, xor) need 2 input connections
            if (!connections.A || !connections.B) {
                console.log(`${gateType} gate missing input connections`);
                return false;
            }
        }
    }
    
    console.log('All gates have connections');
    return true;
}

  unlockNextGate() {
    const gateOrder = ['nand', 'not', 'and', 'or', 'nor', 'xor'];
    const nextIndex = this.currentChallengeIndex + 1;
    
    if (nextIndex < gateOrder.length) {
        const nextGate = gateOrder[nextIndex];
        if (!this.unlockedGates.includes(nextGate)) {
            this.unlockedGates.push(nextGate);
            localStorage.setItem('unlockedLogicGates', JSON.stringify(this.unlockedGates));
            
            console.log(`Unlocked ${nextGate} gate!`);
        }
    } else {
        console.log('All gates unlocked!');
    }
}

  saveProgress() {
    // Save current challenge index
    localStorage.setItem('currentLogicChallengeIndex', this.currentChallengeIndex.toString());
    
    // Update highest level if needed
    const highestLevel = localStorage.getItem('highestLogicChallengeIndex');
    if (!highestLevel || this.currentChallengeIndex > parseInt(highestLevel)) {
      localStorage.setItem('highestLogicChallengeIndex', this.currentChallengeIndex.toString());
    }
  }

  addPoints(points) {
    const user = localStorage.getItem('username');
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const userData = users.find(u => u.username === user);
    if (userData) {
      userData.score = (userData.score || 0) + points;
    }
    localStorage.setItem('users', JSON.stringify(users));
  }

  showTheory(theoryText) {
    const { width, height } = this.cameras.main;

    this.theoryBack = this.add.rectangle(width / 2, height / 2, width + 100, 150, 0x000000, 0.8)
      .setOrigin(0.5)
      .setDepth(10);

    this.theoryText = this.add.text(width / 2, height / 2, theoryText, {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: width - 150 }
    })
      .setOrigin(0.5)
      .setDepth(11);
    
    // Check if there's a next level
    const nextLevelIndex = this.currentChallengeIndex + 1;
    const hasNextLevel = nextLevelIndex < this.logicChallenges.length;
    
    // Create appropriate button
    const buttonLabel = hasNextLevel ? 'Naslednji level' : 'Nazaj na izbiro levelov';
    const buttonColor = hasNextLevel ? '#00cc00' : '#ff4444';
    const hoverColor = hasNextLevel ? '#009900' : '#cc0000';
    
    this.continueButton = this.add.text(width / 2, height / 2 + 70, buttonLabel, {
      fontSize: '18px',
      color: buttonColor,
      backgroundColor: '#ffffff',
      padding: { x: 20, y: 10 }
    })
      .setOrigin(0.5)
      .setDepth(11)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.continueButton.setStyle({ color: hoverColor }))
      .on('pointerout', () => this.continueButton.setStyle({ color: buttonColor }))
      .on('pointerdown', () => {
        if (hasNextLevel) {
          this.goToNextLevel(nextLevelIndex);
        } else {
          this.hideTheory();
          // Go back to level selection
          this.time.delayedCall(500, () => {
            this.scene.start('LevelScene');
          });
        }
      });
  }

  hideTheory() {
    if (this.theoryBack) {
        this.theoryBack.destroy();
        this.theoryBack = null;
    }
    if (this.theoryText) {
        this.theoryText.destroy();
        this.theoryText = null;
    }
    if (this.continueButton) {
        this.continueButton.destroy();
        this.continueButton = null;
    }
}

  goToNextLevel(nextLevelIndex) {
    console.log('Going to next level:', nextLevelIndex);
    
    // Update current level
    this.currentChallengeIndex = nextLevelIndex;
    
    // Save to localStorage
    localStorage.setItem('currentLogicChallengeIndex', nextLevelIndex.toString());
    
    // Update highest level reached if needed
    const highestLevel = localStorage.getItem('highestLogicChallengeIndex');
    if (!highestLevel || nextLevelIndex > parseInt(highestLevel)) {
        localStorage.setItem('highestLogicChallengeIndex', nextLevelIndex.toString());
    }
    
    // Hide theory first
    this.hideTheory();
    
    // Add a small delay for smooth transition
    this.time.delayedCall(300, () => {
        // Fade out
        this.cameras.main.fadeOut(300, 0, 0, 0);
        
        this.time.delayedCall(300, () => {
            // Restart the scene with the new level
            this.scene.restart();
        });
    });
}

resetCircuit() {
    // Reset visual effects
    if (this.circuitVisuals) {
        this.circuitVisuals.resetAllVisuals(this.placedComponents);
    }
    
    console.log(this.placedComponents);
 
    this.placedComponents.forEach(comp => {
        const logicComp = comp.getData('logicComponent');
        if (logicComp && typeof logicComp.reset === 'function') {
            logicComp.reset();
        }
        console.log('Destroying component:', comp.getData('type'));
        
        // Remove all listeners first
        if (comp.inputPins) {
            comp.inputPins.forEach(pin => {
                pin.removeAllListeners();
            });
        }
        
        // Remove the container from the scene
        comp.destroy();
    });
    
    // Clear the array
    this.placedComponents = [];
    
    // RESET INPUT STATES TO DEFAULT
    this.inputStates = {
        A: 0,
        B: 0,
    };
    
    // RESET OUTPUT DISPLAY
    this.updateOutputDisplay(0);
    
    // Update input visuals
    this.updateInputVisuals();
    
    // Update circuit with reset inputs
    this.updateCircuitInputs();
    
    // Reset wire system
    if (this.wireSystem) {
        this.wireSystem.reset();
    }
    
    // Reset status text
    this.checkText.setText('');
}

}

