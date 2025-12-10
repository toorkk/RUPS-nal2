export function spawnNorForCurrentChallenge(scene) {
  const current = scene.logicChallenges[scene.currentChallengeIndex];
  if (!current || current.logicOnly !== true || current.logicNor !== true) return;

  const { width, height } = scene.cameras.main;
  const panelWidth = 150; // prilagodi, če imaš drug panel

  // počisti prejšnji NOR, če obstaja
  if (scene.norContainer) {
    scene.norContainer.destroy();
    scene.norContainer = null;
  }

  scene.norState = { a: 0, b: 0 };

  scene.norCombos = {
    '0-0': false,
    '0-1': false,
    '1-0': false,
    '1-1': false
  };

  const x = panelWidth + (width - panelWidth) / 2;
  const y = height / 2 + 150; // malo nižje od NAND-a, če ju imaš oba

  const container = scene.add.container(x, y).setDepth(50);
  scene.norContainer = container;

  // ----- telo NOR vrat (lahko čisto enaka "kartica" kot NAND) -----
  const g = scene.add.graphics();
  g.fillStyle(0xffffff, 1);
  g.lineStyle(3, 0x000000, 1);
//   g.fillRoundedRect(-50, -30, 100, 60, 12);
//   g.strokeRoundedRect(-50, -30, 100, 60, 12);
  g.strokeCircle(55, 0, 6); // NOT krog

  // dodatno
  g.lineStyle(4, 0x000000, 1);
  g.fillStyle(0xffffff, 1);

  g.beginPath();
  // Increased width + height
  g.moveTo(-35, -45);   // left top
  g.lineTo(45, 0);      // sharper, further tip
  g.lineTo(-35, 45);    // left bottom
  g.closePath();

  g.fillPath();
  g.strokePath();

  const title = scene.add.text(0, 0, 'NOR', {
    fontSize: '14px',
    color: '#000000',
    fontStyle: 'bold'
  }).setOrigin(0.5);

  container.add([g, title]);

  const r = 10;

  const circleA = scene.add.circle(-65, -12, r, 0x666666)
    .setInteractive({ useHandCursor: true });
  const labelA = scene.add.text(-80, -12, 'A', {
    fontSize: '14px',
    color: '#000000'
  }).setOrigin(0.5);

  const circleB = scene.add.circle(-65, 12, r, 0x666666)
    .setInteractive({ useHandCursor: true });
  const labelB = scene.add.text(-80, 12, 'B', {
    fontSize: '14px',
    color: '#000000'
  }).setOrigin(0.5);

  const circleC = scene.add.circle(75, 0, r, 0x666666);
  const labelC = scene.add.text(92, 0, 'C', {
    fontSize: '14px',
    color: '#000000'
  }).setOrigin(0.5);

  container.add([circleA, labelA, circleB, labelB, circleC, labelC]);

  // ----- logika + napredek za NOR -----
  const updateProgress = () => {
    const key = `${scene.norState.a}-${scene.norState.b}`;
    if (scene.norCombos[key] === false) {
      scene.norCombos[key] = true;
    }

    const allDone = Object.values(scene.norCombos).every(v => v === true);
    if (!allDone) return;

    scene.checkText.setStyle({ color: '#00aa00' });
    scene.checkText.setText('Odlično! Preizkusil si vse 4 kombinacije A in B za NOR.');

    const currentChallenge = scene.logicChallenges[scene.currentChallengeIndex];

    const currentLevel = parseInt(localStorage.getItem('currentLogicChallengeIndex') || '0', 10);
    const highestReached = parseInt(localStorage.getItem('highestLogicChallengeIndex') || '0', 10);

    if (currentLevel >= highestReached) {
      const nextLevel = currentLevel + 1;
      localStorage.setItem('highestLogicChallengeIndex', nextLevel.toString());
      localStorage.setItem('currentLogicChallengeIndex', nextLevel.toString());
    }

    if (currentChallenge.theory) {
      scene.showTheory(currentChallenge.theory);
    }
  };

  const setCircleState = () => {
    const on = 0x00aa00;
    const off = 0x666666;
    const { a, b } = scene.norState;
    const c = !(a || b) ? 1 : 0;   // 👈 NOR: NOT (A OR B)

    circleA.setFillStyle(a ? on : off);
    circleB.setFillStyle(b ? on : off);
    circleC.setFillStyle(c ? on : off);

    updateProgress();
  };

  setCircleState();

  circleA.on('pointerdown', () => {
    scene.norState.a = scene.norState.a ? 0 : 1;
    setCircleState();
  });

  circleB.on('pointerdown', () => {
    scene.norState.b = scene.norState.b ? 0 : 1;
    setCircleState();
  });

  container.setData('type', 'nor');

  if (!scene.placedComponents) scene.placedComponents = [];
  scene.placedComponents.push(container);
}
