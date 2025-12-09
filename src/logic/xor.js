export function spawnXorForCurrentChallenge(scene) {
  const current = scene.challenges[scene.currentChallengeIndex];
  if (!current || current.logicOnly !== true || current.logicXor !== true) return;

  const { width, height } = scene.cameras.main;
  const panelWidth = 150;

  // pobriši starega, če obstaja
  if (scene.xorContainer) {
    scene.xorContainer.destroy();
    scene.xorContainer = null;
  }

  scene.xorState = { a: 0, b: 0 };

  scene.xorCombos = {
    '0-0': false,
    '0-1': false,
    '1-0': false,
    '1-1': false
  };

  const x = panelWidth + (width - panelWidth) / 2;
  const y = height / 2 + 150;

  const container = scene.add.container(x, y).setDepth(50);
  scene.xorContainer = container;

  // ----- RISANJE XOR VRAT -----
  const g = scene.add.graphics();
  g.fillStyle(0xffffff, 1);
  g.lineStyle(3, 0x000000, 1);
  g.fillRoundedRect(-50, -30, 100, 60, 12);
  g.strokeRoundedRect(-50, -30, 100, 60, 12);

  const title = scene.add.text(0, 0, 'XOR', {
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

  // ----- LOGIKA + NAPREDEK -----
  const updateProgress = () => {
    const key = `${scene.xorState.a}-${scene.xorState.b}`;
    if (scene.xorCombos[key] === false) {
      scene.xorCombos[key] = true;
    }

    const allDone = Object.values(scene.xorCombos).every(v => v === true);
    if (!allDone) return;

    scene.checkText.setStyle({ color: '#00aa00' });
    scene.checkText.setText('Odlično! Preizkusil si vse 4 kombinacije A in B za XOR.');

    const currentChallenge = scene.challenges[scene.currentChallengeIndex];

    const currentLevel = parseInt(localStorage.getItem('currentChallengeIndex') || '0', 10);
    const highestReached = parseInt(localStorage.getItem('highestChallengeIndex') || '0', 10);

    if (currentLevel >= highestReached) {
      const nextLevel = currentLevel + 1;
      localStorage.setItem('highestChallengeIndex', nextLevel.toString());
      localStorage.setItem('currentChallengeIndex', nextLevel.toString());
    }

    if (currentChallenge.theory) {
      scene.showTheory(currentChallenge.theory);
    }
  };

  const setCircleState = () => {
    const on = 0x00aa00;
    const off = 0x666666;
    const { a, b } = scene.xorState;

    // ✅ XOR LOGIKA:
    const c = (a !== b) ? 1 : 0;

    circleA.setFillStyle(a ? on : off);
    circleB.setFillStyle(b ? on : off);
    circleC.setFillStyle(c ? on : off);

    updateProgress();
  };

  setCircleState();

  circleA.on('pointerdown', () => {
    scene.xorState.a = scene.xorState.a ? 0 : 1;
    setCircleState();
  });

  circleB.on('pointerdown', () => {
    scene.xorState.b = scene.xorState.b ? 0 : 1;
    setCircleState();
  });

  container.setData('type', 'xor');

  if (!scene.placedComponents) scene.placedComponents = [];
  scene.placedComponents.push(container);
}
