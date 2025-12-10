import Phaser from 'phaser';
import { Battery } from '../components/battery';
import { Bulb } from '../components/bulb';
import { Wire } from '../components/wire';
import { CircuitGraph } from '../logic/circuitGraph';
import { Node } from '../logic/node';
import { Switch } from '../components/switch';
import { Resistor } from '../components/resistor';
import { CircuitVisuals } from '../logic/circuitVisuals';
import { CurrentFlowAnimation } from '../logic/currentFlowAnimation';
import { Voltmeter } from '../components/volmeter.js';
import { Ammeter } from '../components/ammeter.js';

export default class WorkspaceScene extends Phaser.Scene {
  constructor() {
    super('WorkspaceScene');
    this.simulationThrottle = null;
    this.isSimulationRunning = false;
    this.simulationDelay = 500;
  }

  init() {
    const savedIndex = localStorage.getItem('currentCircuitChallengeIndex');
    this.currentChallengeIndex = savedIndex !== null ? parseInt(savedIndex) : 0;
  }

  preload() {
    this.graph = new CircuitGraph();
    this.load.image('baterija', 'src/components/battery.png');
    this.load.image('upor', 'src/components/resistor.png');
    this.load.image('svetilka', 'src/components/lamp.png');
    this.load.image('stikalo-on', 'src/components/switch-on.png');
    this.load.image('stikalo-off', 'src/components/switch-off.png');
    this.load.image('žica', 'src/components/wire.png');
    this.load.image('ampermeter', 'src/components/ammeter.png');
    this.load.image('voltmeter', 'src/components/voltmeter.png');
  }

  create() {
    const { width, height } = this.cameras.main;

    this.circuitVisuals = new CircuitVisuals(this);
    this.currentFlowAnim = new CurrentFlowAnimation(this);

    const desk = this.add.rectangle(0, 0, width, height, 0xe0c9a6).setOrigin(0);

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

    this.createCircuitInfoPanel();

    this.currentFlowParticles = [];

    this.circuitChallenges = [
      {
        prompt: 'Sestavi preprosti električni krog z baterijo in svetilko.',
        requiredComponents: ['baterija', 'svetilka', 'žica', 'žica', 'žica', 'žica'],
        theory: ['Osnovni električni krog potrebuje vir, to je v našem primeru baterija. Potrebuje tudi porabnike, to je svetilka. Električni krog je v našem primeru sklenjen, kar je nujno potrebno, da električni tok teče preko prevodnikov oziroma žic.']
      },
      {
        prompt: 'Sestavi preprosti nesklenjeni električni krog z baterijo, svetilko in stikalom.',
        requiredComponents: ['baterija', 'svetilka', 'žica', 'stikalo'],
        theory: ['V nesklenjenem krogu je stikalo odprto, kar pomeni, da je električni tok prekinjen. Svetilka posledično zato ne sveti.']
      },
      {
        prompt: 'Sestavi preprosti sklenjeni električni krog z baterijo, svetilka in stikalom.',
        requiredComponents: ['baterija', 'svetilka', 'žica', 'stikalo'],
        theory: ['V sklenjenem krogu je stikalo zaprto, kar pomeni, da lahko električni tok teče neovirano.']
      },
      {
        prompt: 'Sestavi električni krog z baterijo, svetilko in stikalom, ki ga lahko ugašaš in prižigaš.',
        requiredComponents: ['baterija', 'svetilka', 'žica', 'stikalo', 'stikalo'],
        theory: ['Stikalo nam omogoča nadzor nad pretokom električnega toka. Ko je stikalo zaprto, tok teče in posledično svetilka sveti. Kadar pa je stikalo odprto, tok ne teče in se svetilka ugasne.']
      },
      {
        prompt: 'Sestavi krog z dvema baterijama in svetilko.',
        requiredComponents: ['baterija', 'baterija', 'svetilka', 'žica'],
        theory: ['Kadar vežemo dve ali več baterij zaporedno, se napetosti seštevajo. Večja je napetost, večji je električni tok.']
      },
      {
        prompt: 'V električni krog zaporedno poveži dve svetilki, ki ju priključiš na baterijo.',
        requiredComponents: ['baterija', 'svetilka', 'svetilka', 'žica'],
        theory: ['V zaporedni vezavi teče isti električni tok skozi vse svetilke. Napetost baterije se porazdeli.']
      },
      {
        prompt: 'V električni krog vzporedno poveži dve svetilki, ki ju priključiš na baterijo.',
        requiredComponents: ['baterija', 'svetilka', 'svetilka', 'žica'],
        theory: ['V vzporedni vezavi ima vsaka svetilka enako napetost kot baterija. Električni tok se porazdeli med svetilkama.']
      },
      {
        prompt: 'Sestavi električni krog s svetilko in uporom.',
        requiredComponents: ['baterija', 'svetilka', 'žica', 'upor'],
        theory: ['Upor omejuje tok v krogu. Večji kot je upor, manjši je tok. Spoznajmo Ohmov zakon: tok (I) = napetost (U) / upornost (R).']
      }
    ];

    this.promptText = this.add.text(width / 1.8, height - 30,
      this.circuitChallenges[this.currentChallengeIndex]?.prompt || 'Sestavi električni krog', {
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

    makeButton(width - 140, 25, 'Izbira levela', () => this.scene.start('LevelScene'));
    makeButton(width - 140, 75, 'Lestvica', () => this.scene.start('ScoreboardScene', { cameFromMenu: false }));
    makeButton(width - 140, 125, 'Preveri krog', () => this.checkCircuit());

    const panelWidth = 150;
    this.add.rectangle(0, 0, panelWidth, height, 0xc0c0c0).setOrigin(0);
    this.add.rectangle(0, 0, panelWidth, height, 0x000000, 0.2).setOrigin(0);

    this.add.text(panelWidth / 2, 60, 'Komponente', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const startY = 100;
    const spacing = 90;

    const paletteItems = [
      { type: 'baterija', color: 0xffcc00 },
      { type: 'upor', color: 0xff6600 },
      { type: 'svetilka', color: 0xff0000 },
      { type: 'stikalo', color: 0x666666 },
      { type: 'žica', color: 0x0066cc },
      { type: 'ampermeter', color: 0x00cc66 },
      { type: 'voltmeter', color: 0x00cc66 },
    ];

    paletteItems.forEach((item, index) => {
      this.createComponent(
        panelWidth / 2,
        startY + index * spacing,
        item.type,
        item.color
      );
    });

    this.add.text(width / 2 + 50, 30, 'Povleci komponente na mizo in zgradi svoj električni krog!', {
      fontSize: '20px',
      color: '#333',
      fontStyle: 'bold',
      align: 'center',
      backgroundColor: '#ffffff88',
      padding: { x: 15, y: 8 }
    }).setOrigin(0.5);

    this.placedComponents = [];
    this.gridSize = 40;
  }

  scheduleSimulation() {
    if (this.simulationThrottle) {
      clearTimeout(this.simulationThrottle);
    }

    this.simulationThrottle = setTimeout(() => {
      this.runSimulation();
      this.simulationThrottle = null;
    }, this.simulationDelay);
  }

  createCircuitInfoPanel() {
    const { width, height } = this.cameras.main;

    this.circuitInfoPanel = this.add.container(width - 140, 350);
    this.circuitInfoPanel.setDepth(100);

    const panelBg = this.add.rectangle(0, 0, 200, 180, 0x2c2c2c, 0.95);
    panelBg.setStrokeStyle(2, 0xffffff);

    const title = this.add.text(0, -72, 'Meritve', {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const separator = this.add.rectangle(0, -55, 180, 1, 0xffffff);

    this.voltageText = this.add.text(-85, -40, 'Napetost: -- V', {
      fontSize: '14px',
      color: '#ffcc00'
    });

    this.resistanceText = this.add.text(-85, -15, 'Upornost: -- Ω', {
      fontSize: '14px',
      color: '#ff9900'
    });

    this.currentText = this.add.text(-85, 10, 'Tok: -- A', {
      fontSize: '14px',
      color: '#00ccff'
    });

    this.powerText = this.add.text(-85, 35, 'Moč: -- W', {
      fontSize: '14px',
      color: '#ff6699'
    });

    this.statusText = this.add.text(0, 65, '', {
      fontSize: '12px',
      color: '#aaaaaa',
      align: 'center'
    }).setOrigin(0.5);

    this.circuitInfoPanel.add([
      panelBg,
      title,
      separator,
      this.voltageText,
      this.resistanceText,
      this.currentText,
      this.powerText,
      this.statusText
    ]);
  }

  updateCircuitInfoPanel(result) {
    if (!result) {
      this.voltageText.setText('Napetost: -- V');
      this.resistanceText.setText('Upornost: -- Ω');
      this.currentText.setText('Tok: -- A');
      this.powerText.setText('Moč: -- W');
      this.statusText.setText('');
      this.statusText.setColor('#aaaaaa');
      return;
    }

    if (result.closed) {
      const voltage = result.totalVoltage || 0;
      const current = result.current || 0;
      const power = voltage * current;

      const resistance = current > 0 ? voltage / current : Infinity;

      this.voltageText.setText(`Napetost: ${voltage.toFixed(2)} V`);
      this.resistanceText.setText(`Upornost: ${resistance < 10000 ? resistance.toFixed(2) : '∞'} Ω`);
      this.currentText.setText(`Tok: ${current.toFixed(3)} A`);
      this.powerText.setText(`Moč: ${power.toFixed(3)} W`);
      this.statusText.setText('Krog sklenjen');
      this.statusText.setColor('#00ff00');
    } else {
      this.voltageText.setText('Napetost: 0 V');
      this.resistanceText.setText('Upornost: ∞ Ω');
      this.currentText.setText('Tok: 0 A');
      this.powerText.setText('Moč: 0 W');
      this.statusText.setText('Krog odprt');
      this.statusText.setColor('#ff0000');
    }
  }

  runSimulation() {
    if (this.isSimulationRunning) {
      return null;
    }

    this.isSimulationRunning = true;

    try {
      this.currentFlowAnim.stop();
      this.circuitVisuals.resetAllVisuals(this.placedComponents);

      const result = this.graph.simulate();

      this.updateCircuitInfoPanel(result);

      if (result) {
        this.circuitVisuals.updateComponentVisuals(result, this.placedComponents, this.graph);

        if (result.status === 1) {
          this.checkText.setStyle({ color: '#00aa00' });
          this.checkText.setText('Električni tok teče!');
          this.sim = true;

          this.currentFlowAnim.start(result, this.placedComponents, this.graph);
        } else {
          this.checkText.setStyle({ color: '#cc0000' });
          if (result.status === -1) {
            this.checkText.setText('Manjka ti baterija');
          } else if (result.status === 0) {
            this.checkText.setText('Električni tok ni sklenjen');
          }
          this.sim = false;
        }
      } else {
        this.checkText.setStyle({ color: '#cc0000' });
        this.checkText.setText('Krog ni pravilno sestavljen');
        this.sim = false;
      }

      return result;
    } catch (error) {
      console.error('Simulation error:', error);
      this.checkText.setStyle({ color: '#cc0000' });
      this.checkText.setText('Napaka pri simulaciji');
      return null;
    } finally {
      this.isSimulationRunning = false;
    }
  }

  resetCircuit() {
    if (this.simulationThrottle) {
      clearTimeout(this.simulationThrottle);
      this.simulationThrottle = null;
    }

    this.currentFlowAnim.stop();
    this.circuitVisuals.resetAllVisuals(this.placedComponents);

    for (const placedComp of this.placedComponents) {
      const logicComp = placedComp.getData('logicComponent');
      if (logicComp) {
        if (logicComp.type === 'bulb' && typeof logicComp.reset === 'function') {
          logicComp.reset();
        }
      }
    }

    this.updateCircuitInfoPanel(null);
    this.checkText.setText('');
    this.sim = undefined;
  }

  getComponentDetails(type) {
    const details = {
      'baterija': 'Napetost: 9 V\nVir električne energije',
      'upor': 'Upornost: 220 Ω\nOmejuje tok',
      'svetilka': 'Upornost: 100 Ω\nPretvarja v svetlobo',
      'stikalo': 'Stanje: ZAPRTO\nDovoljuje tok\nStanje: ODPRTO\nPrepreči tok',
      'žica': 'Upornost: 1 Ω\nPovezuje komponente',
      'ampermeter': 'Meri električni tok\nEnota: amperi (A)',
      'voltmeter': 'Meri napetost\nEnota: volti (V)'
    };
    return details[type] || 'Komponenta';
  }

  snapToGrid(x, y) {
    const gridSize = this.gridSize;
    const startX = 200;

    const snappedX = Math.round((x - startX) / gridSize) * gridSize + startX;
    const snappedY = Math.round(y / gridSize) * gridSize;

    return { x: snappedX, y: snappedY };
  }

  getRandomInt(min, max) {
    const minCeiled = Math.ceil(min);
    const maxFloored = Math.floor(max);
    return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled);
  }

  updateLogicNodePositions(component) {
    const comp = component.getData('logicComponent');
    if (!comp) return;

    const halfW = 40;
    const halfH = 40;

    const localStart = comp.localStart || { x: -halfW, y: 0 };
    const localEnd = comp.localEnd || { x: halfW, y: 0 };

    const theta = Phaser.Math.DegToRad(component.angle || 0);

    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    const rotate = (p) => ({
      x: Math.round(p.x * cos - p.y * sin),
      y: Math.round(p.x * sin + p.y * cos)
    });

    const rStart = rotate(localStart);
    const rEnd = rotate(localEnd);

    const worldStart = { x: component.x + rStart.x, y: component.y + rStart.y };
    const worldEnd = { x: component.x + rEnd.x, y: component.y + rEnd.y };

    const snappedStart = this.snapToGrid(worldStart.x, worldStart.y);
    const snappedEnd = this.snapToGrid(worldEnd.x, worldEnd.y);

    if (comp.start) {
      comp.start.x = snappedStart.x;
      comp.start.y = snappedStart.y;
      if (!comp.start.connected) comp.start.connected = new Set();
      this.graph.addNode(comp.start);
    }
    if (comp.end) {
      comp.end.x = snappedEnd.x;
      comp.end.y = snappedEnd.y;
      if (!comp.end.connected) comp.end.connected = new Set();
      this.graph.addNode(comp.end);
    }

    const startDot = component.getData('startDot');
    const endDot = component.getData('endDot');
    if (startDot && comp.start) { startDot.x = comp.start.x; startDot.y = comp.start.y; }
    if (endDot && comp.end) { endDot.x = comp.end.x; endDot.y = comp.end.y; }

    const valueText = component.getData('valueText');
    if (valueText) {
      valueText.setPosition(component.x, component.y - 50);
    }

    const glow = component.getData('glowEffect');
    if (glow) {
      glow.setPosition(component.x, component.y);
    }
  }

  createComponent(x, y, type, color) {
    const component = this.add.container(x, y);

    let comp = null;
    let componentImage;
    let id;

    switch (type) {
      case 'baterija':
        id = "bat_" + this.getRandomInt(1000, 9999);
        comp = new Battery(
          id,
          new Node(id + '_start', -40, 0),
          new Node(id + '_end', 40, 0),
          9
        );
        comp.type = 'battery';
        comp.localStart = { x: -40, y: 0 };
        comp.localEnd = { x: 40, y: 0 };
        componentImage = this.add.image(0, 0, 'baterija')
          .setOrigin(0.5)
          .setDisplaySize(100, 100);
        component.add(componentImage);
        component.setData('logicComponent', comp);
        break;

      case 'upor':
        id = "res_" + this.getRandomInt(1000, 9999);
        comp = new Resistor(
          id,
          new Node(id + '_start', -40, 0),
          new Node(id + '_end', 40, 0),
          220
        );
        comp.type = 'resistor';
        comp.localStart = { x: -40, y: 0 };
        comp.localEnd = { x: 40, y: 0 };
        componentImage = this.add.image(0, 0, 'upor')
          .setOrigin(0.5)
          .setDisplaySize(100, 100);
        component.add(componentImage);
        component.setData('logicComponent', comp);
        break;

      case 'svetilka':
        id = "bulb_" + this.getRandomInt(1000, 9999);
        comp = new Bulb(
          id,
          new Node(id + '_start', -40, 0),
          new Node(id + '_end', 40, 0),
          100
        );
        comp.type = 'bulb';
        comp.localStart = { x: -40, y: 0 };
        comp.localEnd = { x: 40, y: 0 };
        componentImage = this.add.image(0, 0, 'svetilka')
          .setOrigin(0.5)
          .setDisplaySize(100, 100);
        component.add(componentImage);
        component.setData('logicComponent', comp);
        break;

      case 'stikalo':
        id = "switch_" + this.getRandomInt(1000, 9999);
        comp = new Switch(
          id,
          new Node(id + "_start", -40, 0),
          new Node(id + "_end", 40, 0),
          false
        );
        comp.type = 'switch';
        comp.localStart = { x: -40, y: 0 };
        comp.localEnd = { x: 40, y: 0 };

        componentImage = this.add.image(0, 0, 'stikalo-off')
          .setOrigin(0.5)
          .setDisplaySize(100, 100)
          .setName('switchImage');

        component.add(componentImage);
        component.setData('logicComponent', comp);
        break;

      case 'žica':
        id = "wire_" + this.getRandomInt(1000, 9999);
        comp = new Wire(
          id,
          new Node(id + '_start', -40, 0),
          new Node(id + '_end', 40, 0)
        );
        comp.type = 'wire';
        comp.localStart = { x: -40, y: 0 };
        comp.localEnd = { x: 40, y: 0 };
        componentImage = this.add.image(0, 0, 'žica')
          .setOrigin(0.5)
          .setDisplaySize(100, 100);
        component.add(componentImage);
        component.setData('logicComponent', comp);
        break;

      case 'ampermeter':
        id = "ammeter_" + this.getRandomInt(1000, 9999);
        comp = new Ammeter(
          id,
          new Node(id + '_start', -40, 0),
          new Node(id + '_end', 40, 0)
        );
        comp.type = 'ammeter';
        comp.localStart = { x: -40, y: 0 };
        comp.localEnd = { x: 40, y: 0 };
        componentImage = this.add.image(0, 0, 'ampermeter')
          .setOrigin(0.5)
          .setDisplaySize(100, 100);
        component.add(componentImage);
        component.setData('logicComponent', comp);
        break;

      case 'voltmeter':
        id = "voltmeter_" + this.getRandomInt(1000, 9999);
        comp = new Voltmeter(
          id,
          new Node(id + '_start', -40, 0),
          new Node(id + '_end', 40, 0)
        );
        comp.type = 'voltmeter';
        comp.localStart = { x: -40, y: 0 };
        comp.localEnd = { x: 40, y: 0 };
        componentImage = this.add.image(0, 0, 'voltmeter')
          .setOrigin(0.5)
          .setDisplaySize(100, 100);
        component.add(componentImage);
        component.setData('logicComponent', comp);
        break;
    }

    component.on('pointerover', () => {
      if (component.getData('isInPanel')) {
        const details = this.getComponentDetails(type);
        this.infoText.setText(details);

        this.infoWindow.x = x + 120;
        this.infoWindow.y = y;
        this.infoWindow.setVisible(true);
      }
      component.setScale(1.1);
    });

    component.on('pointerout', () => {
      if (component.getData('isInPanel')) {
        this.infoWindow.setVisible(false);
      }
      component.setScale(1);
    });

    const label = this.add.text(0, 45, type, {
      fontSize: '11px',
      color: '#fff',
      backgroundColor: '#00000088',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5);
    component.add(label);
    component.setData('label', label);

    component.setSize(70, 70);
    component.setInteractive({ draggable: true, useHandCursor: true });

    component.setData('originalX', x);
    component.setData('originalY', y);
    component.setData('type', type);
    component.setData('color', color);
    component.setData('isInPanel', true);
    component.setData('rotation', 0);
    if (comp) component.setData('logicComponent', comp);
    component.setData('isDragging', false);
    component.setData('componentId', id);

    this.input.setDraggable(component);

    component.on('dragstart', () => {
      component.setData('isDragging', true);
      this.checkText.setText('');
    });

    component.on('drag', (pointer, dragX, dragY) => {
      component.x = dragX;
      component.y = dragY;
    });

    component.on('dragend', () => {
      component.setData('isDragging', false);
      const isInPanel = component.x < 200;

      if (isInPanel && !component.getData('isInPanel')) {
        this.removeComponentFromCircuit(component);
        component.destroy();
        this.scheduleSimulation();
      } else if (!isInPanel && component.getData('isInPanel')) {
        const snapped = this.snapToGrid(component.x, component.y);
        component.x = snapped.x;
        component.y = snapped.y;

        const label = component.getData('label');
        if (label) {
          label.setVisible(false);
        }

        const comp = component.getData('logicComponent');
        if (comp) {
          this.graph.addComponent(comp);

          if (comp.start) this.graph.addNode(comp.start);
          if (comp.end) this.graph.addNode(comp.end);
        }

        this.updateLogicNodePositions(component);
        component.setData('isRotated', false);
        component.setData('isInPanel', false);

        this.createComponent(
          component.getData('originalX'),
          component.getData('originalY'),
          component.getData('type'),
          component.getData('color')
        );

        this.placedComponents.push(component);
        this.scheduleSimulation();

      } else if (!component.getData('isInPanel')) {
        const snapped = this.snapToGrid(component.x, component.y);
        component.x = snapped.x;
        component.y = snapped.y;

        this.updateLogicNodePositions(component);
        this.scheduleSimulation();

      } else {
        component.x = component.getData('originalX');
        component.y = component.getData('originalY');
        component.angle = 0;
        component.setData('rotation', 0);
      }
    });

    component.on('pointerdown', () => {
      if (!component.getData('isInPanel')) {
        component.setData('clickTime', this.time.now);
      }
    });

    component.on('pointerup', () => {
      if (!component.getData('isInPanel')) {
        const clickTime = component.getData('clickTime');
        const clickDuration = this.time.now - clickTime;

        if (clickDuration < 200) {
          const logicComp = component.getData('logicComponent');

          if (logicComp && logicComp.type === 'switch') {
            logicComp.toggle();

            const img = component.getByName('switchImage')
              || component.list.find(child => child.type === 'Image');

            if (img) {
              img.setTexture(logicComp.is_on ? 'stikalo-on' : 'stikalo-off');
            }

            this.scheduleSimulation();
            return;
          }

          component.angle = (component.angle + 90) % 360;
          this.updateLogicNodePositions(component);
          this.scheduleSimulation();
        }
      }
    });

    return component;
  }

  removeComponentFromCircuit(component) {
    const logicComp = component.getData('logicComponent');
    if (logicComp) {
      const index = this.graph.components.indexOf(logicComp);
      if (index > -1) {
        this.graph.components.splice(index, 1);
      }

      if (logicComp.start) {
        this.graph.nodes.delete(logicComp.start.id);
      }
      if (logicComp.end) {
        this.graph.nodes.delete(logicComp.end.id);
      }
    }

    this.circuitVisuals.removeGlowEffect(component);
    this.circuitVisuals.hideComponentValue(component);

    const placedIndex = this.placedComponents.indexOf(component);
    if (placedIndex > -1) {
      this.placedComponents.splice(placedIndex, 1);
    }

    this.scheduleSimulation();
  }

  checkCircuit() {
    const currentChallenge = this.circuitChallenges[this.currentChallengeIndex];
    const placedTypes = this.placedComponents.map(comp => comp.getData('type'));
    this.checkText.setStyle({ color: '#cc0000' });

    if (!currentChallenge.requiredComponents.every(req => placedTypes.includes(req))) {
      this.checkText.setText('Manjkajo komponente za krog.');
      return;
    }

    if (this.sim == undefined) {
      this.checkText.setText('Zaženi simulacijo');
      return;
    }

    if (this.sim == false) {
      this.checkText.setText('Električni krog ni sklenjen. Preveri kako si ga sestavil');
      return;
    }

    this.checkText.setStyle({ color: '#00aa00' });
    this.checkText.setText('Čestitke! Krog je pravilen.');
    this.addPoints(10);
    const currentLevel = parseInt(localStorage.getItem('currentCircuitChallengeIndex') || '0');
    const highestReached = parseInt(localStorage.getItem('highestCircuitChallengeIndex') || '0');

    if (currentLevel >= highestReached) {
      const nextLevel = currentLevel + 1;
      localStorage.setItem('highestCircuitChallengeIndex', nextLevel.toString());
      localStorage.setItem('currentCircuitChallengeIndex', nextLevel.toString());
    }

    if (currentChallenge.theory) {
      this.showTheory(currentChallenge.theory);
    } else {
      this.checkText.setStyle({ color: '#00aa00' });
      this.checkText.setText('Čestitke! Krog je pravilen.');
      this.addPoints(10);
      this.time.delayedCall(2000, () => this.nextChallenge());
    }
  }

  nextChallenge() {
    this.currentChallengeIndex++;
    localStorage.setItem('currentCircuitChallengeIndex', this.currentChallengeIndex.toString());
    this.checkText.setText('');

    this.resetCircuit();

    this.placedComponents.forEach(comp => {
      this.circuitVisuals.removeGlowEffect(comp);
      this.circuitVisuals.hideComponentValue(comp);
      comp.destroy();
    });
    this.placedComponents = [];

    this.graph = new CircuitGraph();

    if (this.currentChallengeIndex < this.circuitChallenges.length) {
      this.promptText.setText(this.circuitChallenges[this.currentChallengeIndex].prompt);
    } else {
      this.promptText.setText('Vse naloge so uspešno opravljene! Čestitke!');
      localStorage.removeItem('currentCircuitChallengeIndex');
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

    this.continueButton = this.add.text(width / 2, height / 2 + 70, 'Nadaljuj', {
      fontSize: '18px',
      color: '#0066ff',
      backgroundColor: '#ffffff',
      padding: { x: 20, y: 10 }
    })
      .setOrigin(0.5)
      .setDepth(11)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.continueButton.setStyle({ color: '#0044cc' }))
      .on('pointerout', () => this.continueButton.setStyle({ color: '#0066ff' }))
      .on('pointerdown', () => {
        this.hideTheory();
        this.nextChallenge();
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
}