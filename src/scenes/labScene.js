import Phaser from 'phaser';

export default class LabScene extends Phaser.Scene {
  constructor() {
    super('LabScene');
  }

  preload() {
        this.load.image('avatar1', 'src/avatars/avatar1.png');
        this.load.image('avatar2', 'src/avatars/avatar2.png');
        this.load.image('avatar3', 'src/avatars/avatar3.png');
        this.load.image('avatar4', 'src/avatars/avatar4.png');
        this.load.image('avatar5', 'src/avatars/avatar5.png');
        this.load.image('avatar6', 'src/avatars/avatar6.png');
        this.load.image('avatar7', 'src/avatars/avatar7.png');
        this.load.image('avatar8', 'src/avatars/avatar8.png');
        this.load.image('avatar9', 'src/avatars/avatar9.png');
        this.load.image('avatar10', 'src/avatars/avatar10.png');
        this.load.image('avatar11', 'src/avatars/avatar11.png');

        this.load.image('tool_pliers', 'src/assets/tools/pliers.png');
        this.load.image('tool_screwdriver', 'src/assets/tools/screwdriver.png');
        this.load.image('bulb', 'src/assets/tools/bulb.png');

        this.load.image('sci_tesla',   'src/assets/scientists/tesla.jpg');
        this.load.image('sci_edison',   'src/assets/scientists/edison.webp');
    }

  create() {
    const { width, height } = this.cameras.main;
    
    // ozadje laboratorija
    this.add.rectangle(0, 0, width, height, 0xf0f0f0).setOrigin(0).setDepth(-1);
    
    // stena
    // this.add.rectangle(0, 0, width, height - 150, 0xe8e8e8).setOrigin(0);

    const panelW = 240;
    const panelH = 180;
    const panels = this.add.graphics({ x: 0, y: 0 });
    panels.setDepth(0);

    const baseColor = 0xf2f2f2;
    const shadowColor = 0xe0e0e0;

    for (let py = 0; py < height + panelH; py += panelH) {
      for (let px = 0; px < width + panelW; px += panelW) {
        const variation = Phaser.Math.Between(-8, 8);
        const color = Phaser.Display.Color.ValueToColor(baseColor);
        color.r += variation;
        color.g += variation;
        color.b += variation;

        panels.fillStyle(color.color, 1);
        panels.fillRect(px + 8, py + 8, panelW - 16, panelH - 16);

        panels.lineStyle(2, 0xd5d5d5, 0.6);
        panels.strokeRect(px + 8, py + 8, panelW - 16, panelH - 16);

        panels.fillStyle(0xcccccc, 0.7);
        for (let dy = 30; dy < panelH - 20; dy += 28) {
          for (let dx = 30; dx < panelW - 20; dx += 28) {
            panels.fillCircle(px + 8 + dx, py + 8 + dy, 3);
          }
        }
      }
    }

    // tla
    // this.add.rectangle(0, height - 90, width, 150, 0xd4c4a8).setOrigin(0).setDepth(2);
    const floorY = height - 90;
    const floorHeight = 90;

    this.add.rectangle(0, floorY, width, floorHeight, 0xd8d0c7)
        .setOrigin(0, 0)
        .setDepth(2);

    const speckles = this.add.graphics();
    speckles.setDepth(2);

    for (let i = 0; i < width * floorHeight / 100; i++) { 
        const x = Phaser.Math.Between(0, width);
        const y = Phaser.Math.Between(floorY, floorY + floorHeight);
        const color = Phaser.Utils.Array.GetRandom([0x333333, 0x444444, 0x555555, 0x222222]);
        const alpha = Phaser.Math.FloatBetween(0.5, 0.9);
        const size = Phaser.Math.Between(1, 3);

        speckles.fillStyle(color, alpha);
        speckles.fillCircle(x, y + 5, size);
    }

    // znanstveniki
    // helper za ustvarjanje okvirja z znanstvenikom
    const createScientistFrame = (x, y, textureKey, name, description) => {
      const frameWidth = 180;
      const frameHeight = 220;

      // okvir
      const frame = this.add.rectangle(
        x,
        y,
        frameWidth,
        frameHeight,
        0x000000,
        0.25
      )
        .setStrokeStyle(4, 0x654321)
        .setDepth(0);

      // portret
      const portrait = this.add.image(x, y, textureKey)
        .setDisplaySize(frameWidth - 12, frameHeight - 12)
        .setDepth(1)
        .setInteractive({ useHandCursor: true });

      // ime pod sliko
      const nameText = this.add.text(
        x,
        y + frameHeight / 2 + 18,
        name,
        {
          fontSize: '18px',
          color: '#000000'
        }
      ).setOrigin(0.5).setDepth(1);

      // tooltip background (črn pravokotnik)
      const tooltipWidth = 260;
      const tooltipHeight = 90;
      const tooltipY = y - frameHeight / 2 + 300;

      const tooltipBg = this.add.rectangle(
        x,
        tooltipY,
        tooltipWidth,
        tooltipHeight,
        0x000000,
        0.85
      )
        .setStrokeStyle(2, 0xffffff)
        .setDepth(5)
        .setVisible(false);

      // tooltip text
      const tooltipText = this.add.text(
        tooltipBg.x,
        tooltipBg.y,
        description,
        {
          fontSize: '14px',
          color: '#ffffff',
          align: 'center',
          wordWrap: { width: tooltipWidth - 20 }
        }
      ).setOrigin(0.5).setDepth(6).setVisible(false);

      // animacija (da ni čisto statičen)
      this.tweens.add({
        targets: portrait,
        angle: textureKey === 'sci_tesla' ? 1.5 : -1.5,
        duration: 4000,
        yoyo: true,
        repeat: -1
      });

      // hover – pokaži opis
      portrait.on('pointerover', () => {
        tooltipBg.setVisible(true);
        tooltipText.setVisible(true);
      });

      portrait.on('pointerout', () => {
        tooltipBg.setVisible(false);
        tooltipText.setVisible(false);
      });
    };

    // dimenzije stene (zgornji del)
    const wallHeight = height - 150;
    const wallCenterY = wallHeight / 2;

    // desno: Nikola Tesla
    createScientistFrame(
      width - 160,
      wallCenterY - 40,
      'sci_tesla',
      'Nikola Tesla',
      'Pionir izmeničnega toka, brezžičnega prenosa energije in mnogih drugih izumov.'
    );

    // levo: Michael Faraday (ali kdorkoli želiš)
    createScientistFrame(
      160,
      wallCenterY - 40,
      'sci_edison', // poskrbi, da je naložen v preload()
      'Thomas Edison',
      'Izumitelj električne žarnice za praktično uporabo in eden najpomembnejših inovatorjev na področju elektrike, zvoka in filma.'
    );

    // miza
    const tableX = width / 2;
    const tableY = height / 2 + 50;
    const tableWidth = 500;
    const tableHeight = 250;
    
    // miza (del, ki se klikne)
    // const tableTop = this.add.rectangle(tableX, tableY, tableWidth, 30, 0x8b4513).setOrigin(0.5);
    
    // // delovna površina mize
    // const tableSurface = this.add.rectangle(tableX, tableY + 15, tableWidth - 30, tableHeight - 30, 0xa0826d).setOrigin(0.5, 0);

    // 1. debel kovinsko-siv rob (namesto rjavega lesa)
    this.add.rectangle(tableX, tableY + 8, tableWidth + 20, 20, 0xcccccc).setDepth(3);

    // 2. svetla bleščica na robu (da je videti kovinsko)
    this.add.rectangle(tableX, tableY + 3, tableWidth + 20, 8, 0xffffff).setAlpha(0.5).setDepth(3);

    // 3. prava temno siva ESD podloga namesto rjave
    const tableSurface = this.add.rectangle(tableX, tableY + 15, tableWidth - 20, tableHeight - 20, 0x444444)
        .setOrigin(0.5, 0)
        .setDepth(2);

    // mini senca pod podlogo (da ni ploščato)
    this.add.rectangle(tableX, tableY + 120, tableWidth - 20, 25, 0x000000).setAlpha(0.2).setDepth(2);  
    
    // mreža
    const gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(1, 0x8b7355, 0.3);
    const gridSize = 30;
    const gridStartX = tableX - (tableWidth - 30) / 2;
    const gridStartY = tableY + 15;
    const gridEndX = tableX + (tableWidth - 30) / 2;
    const gridEndY = tableY + 15 + (tableHeight - 30);
    
    for (let x = gridStartX; x <= gridEndX; x += gridSize) {
      gridGraphics.beginPath();
      gridGraphics.moveTo(x, gridStartY);
      gridGraphics.lineTo(x, gridEndY);
      gridGraphics.strokePath();
    }
    for (let y = gridStartY; y <= gridEndY; y += gridSize) {
      gridGraphics.beginPath();
      gridGraphics.moveTo(gridStartX, y);
      gridGraphics.lineTo(gridEndX, y);
      gridGraphics.strokePath();
    }

  

    // dekorativna orodja na mizi 
    const tools = [
      { key: 'tool_pliers',      offsetX: -tableWidth / 3,   offsetY: -80,  angle: -10, scale: 0.2   },
      { key: 'tool_screwdriver', offsetX: -tableWidth / 100, offsetY: -110, angle: 15,  scale: 0.015 },
      { key: 'bulb',             offsetX: 150,               offsetY: -100, angle: -5,  scale: 0.04  }
    ];

    tools.forEach(tool => {
      const img = this.add.image(
        tableX + tool.offsetX,
        tableY + 30 + tool.offsetY, // 30, ker tableSurface začne malo pod tableY
        tool.key
      )
        .setScale(tool.scale)
        .setAngle(tool.angle)
        .setDepth(2)
        .setInteractive({ useHandCursor: false }); // lahko daš true, če želiš roko

      // shranimo "osnovne" vrednosti
      img.setData('baseScale', tool.scale);
      img.setData('baseY', img.y);

      // "dihanje" – rahlo gor/dol
      const breatheTween = this.tweens.add({
        targets: img,
        y: img.y - 3,
        duration: 2000,
        yoyo: true,
        repeat: -1
      });

      img.setData('breatheTween', breatheTween);

      // HOVER: miška gre preko orodja
      img.on('pointerover', () => {
        const bt = img.getData('breatheTween');
        if (bt) bt.pause(); // ustavimo dihanje, da ni čudnih premikov

        this.tweens.add({
          targets: img,
          y: img.getData('baseY') - 20,       // rahlo poskoči
          scale: img.getData('baseScale') * 1.1, // malo večje
          duration: 120,
          ease: 'Power2'
        });
      });

      // HOVER OUT: miška gre stran
      img.on('pointerout', () => {
        this.tweens.add({
          targets: img,
          y: img.getData('baseY'),
          scale: img.getData('baseScale'),
          duration: 120,
          ease: 'Power2',
          onComplete: () => {
            const bt = img.getData('breatheTween');
            if (bt) bt.resume(); // nadaljuj dihanje
          }
        });
      });
    });


    // nogice mize
    // const legWidth = 20;
    // const legHeight = 150;
    // this.add.rectangle(tableX - tableWidth/2 + 40, tableY + tableHeight/2 + 20, legWidth, legHeight, 0x654321);
    // this.add.rectangle(tableX + tableWidth/2 - 40, tableY + tableHeight/2 + 20, legWidth, legHeight, 0x654321);
    
    // interaktivnost mize
    const interactiveZone = this.add.zone(tableX, tableY + tableHeight/2, tableWidth, tableHeight)
      .setInteractive({ useHandCursor: true });
    
    const instruction = this.add.text(tableX, tableY - 200, 'Klikni na mizo in začni graditi svoj električni krog!', {
      fontSize: '24px',
      color: '#333',
      fontStyle: 'bold',
      backgroundColor: '#928888ff',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5);
    
    // animacija besedila
    this.tweens.add({
      targets: instruction,
      alpha: 0.5,
      duration: 1000,
      yoyo: true,
      repeat: -1
    });
    
    // zoom na mizo
    interactiveZone.on('pointerdown', () => {
      this.cameras.main.fade(300, 0, 0, 0);
      this.time.delayedCall(300, () => {
        this.scene.start('WorkspaceScene');
      });
    });
    
    interactiveZone.on('pointerover', () => {
      tableSurface.setFillStyle(0x777777);
    });
    
    interactiveZone.on('pointerout', () => {
      tableSurface.setFillStyle(0x444444);
    });

    const username = localStorage.getItem('username');
    const pfp = localStorage.getItem('profilePic');

    // avvatar
    const avatarX = 230;
    const avatarY = 55;
    const avatarRadius = 30;
    const borderThickness = 4;

    // zunanji siv krog (rob)
    const borderCircle = this.add.circle(avatarX, avatarY, avatarRadius + borderThickness, 0xcccccc);

    // notranji bel krog (ozadje za avatar)
    const innerCircle = this.add.circle(avatarX, avatarY, avatarRadius, 0xffffff);

    // slika avatarja
    const avatarImage = this.add.image(avatarX, avatarY, pfp)
        .setDisplaySize(avatarRadius * 2, avatarRadius * 2);

    // maska, da je slika samo znotraj notranjega kroga
    const mask = innerCircle.createGeometryMask();
    avatarImage.setMask(mask);

    // pozdravno besedilo
    this.add.text(avatarX + 60, avatarY - 10, `Dobrodošel v laboratoriju, uporabnik ${username}!`, {
        fontSize: '22px',
        color: '#222',
        fontStyle: 'bold'
    });


    const logoutButton = this.add.text(40, 30, '↩ Odjavi se', {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#0066ff',
        padding: { x: 20, y: 10 }
    })
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => logoutButton.setStyle({ color: '#0044cc' }))
        .on('pointerout', () => logoutButton.setStyle({ color: '#0066ff' }))
        .on('pointerdown', () => {
            localStorage.removeItem('username');
            this.scene.start('MenuScene');
        });

    const buttonWidth = 180;
    const buttonHeight = 45;
    const cornerRadius = 10;
    const rightMargin = 60;
    const topMargin = 40;

    // za scoreboard
    const scoreButtonBg = this.add.graphics();
    scoreButtonBg.fillStyle(0x3399ff, 1);
    scoreButtonBg.fillRoundedRect(width - buttonWidth - rightMargin, topMargin, buttonWidth, buttonHeight, cornerRadius);

    const scoreButton = this.add.text(width - buttonWidth / 2 - rightMargin, topMargin + buttonHeight / 2, 'Lestvica', {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#ffffff'
    })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => {
            scoreButtonBg.clear();
            scoreButtonBg.fillStyle(0x0f5cad, 1);
            scoreButtonBg.fillRoundedRect(width - buttonWidth - rightMargin, topMargin, buttonWidth, buttonHeight, cornerRadius);
        })
        .on('pointerout', () => {
            scoreButtonBg.clear();
            scoreButtonBg.fillStyle(0x3399ff, 1);
            scoreButtonBg.fillRoundedRect(width - buttonWidth - rightMargin, topMargin, buttonWidth, buttonHeight, cornerRadius);
        })
        .on('pointerdown', () => {
            this.scene.start('ScoreboardScene', {cameFromMenu: true});
        });


    const levelButtonBg = this.add.graphics();
    levelButtonBg.fillStyle(0x3399ff, 1);
    levelButtonBg.fillRoundedRect(width - buttonWidth - rightMargin, topMargin + buttonHeight + 20, buttonWidth, buttonHeight, cornerRadius);
    const levelButton = this.add.text(width - buttonWidth / 2 - rightMargin, topMargin + buttonHeight + 20 + buttonHeight / 2, 'Izbira levela', {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#ffffff'
    })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => {
            levelButtonBg.clear();
            levelButtonBg.fillStyle(0x0f5cad, 1);
            levelButtonBg.fillRoundedRect(width - buttonWidth - rightMargin, topMargin + buttonHeight + 20, buttonWidth, buttonHeight, cornerRadius);
        })
        .on('pointerout', () => {
            levelButtonBg.clear();
            levelButtonBg.fillStyle(0x3399ff, 1);
            levelButtonBg.fillRoundedRect(width - buttonWidth - rightMargin, topMargin + buttonHeight + 20, buttonWidth, buttonHeight, cornerRadius);
        })
        .on('pointerdown', () => {
            this.scene.start('LevelScene');
        });

    // this.input.keyboard.on('keydown-ESC', () => {
    //     this.scene.start('MenuScene');
    // });

    //console.log(`${localStorage.getItem('username')}`);
    console.log(JSON.parse(localStorage.getItem('users')));
  }
}
