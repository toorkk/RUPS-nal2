import Phaser from 'phaser';

export default class LevelScene extends Phaser.Scene {
    constructor() {
        super('LevelScene');
    }
    
    preload() {}
    
    create() {
        const { width, height } = this.cameras.main;
        
        // Get the highest level the player has reached (unlocked)
        const highestReached = localStorage.getItem('highestChallengeIndex');
        const maxUnlockedLevel = highestReached !== null ? parseInt(highestReached) : 0;
        
        // Get the currently selected level (defaults to highest reached)
        const currentSelected = localStorage.getItem('currentChallengeIndex');
        const selectedLevel = currentSelected !== null ? parseInt(currentSelected) : maxUnlockedLevel;
        
        // Total number of levels in the game
        const totalLevels = 11;
        
        // Title
        this.add.text(width / 2, 60, 'Izberite nivo', {
            fontSize: '40px',
            color: '#000000ff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        // Create level buttons
        const gridStartY = 150;
        const spacingY = 70;
        
        for (let i = 0; i < totalLevels; i++) {
            const level = i;
            // A level is unlocked if it's at or below the highest reached level
            const unlocked = level <= maxUnlockedLevel;
            const isCurrentlySelected = level === selectedLevel;
            
            // Background color: green if unlocked, gray if locked, brighter if selected
            let bgColor;
            if (!unlocked) {
                bgColor = 0x555555; // Locked
            } else if (isCurrentlySelected) {
                bgColor = 0x2E7D32; // Currently selected
            } else {
                bgColor = 0x4CAF50; // Unlocked
            }
            
            const bg = this.add.rectangle(
                width / 2, 
                gridStartY + i * spacingY, 
                350, 
                50,
                bgColor, 
                1
            ).setStrokeStyle(isCurrentlySelected ? 4 : 2, isCurrentlySelected ? 0xFFEB3B : 0xffffff);
            
            // Label text
            const labelText = unlocked 
                ? `Nivo ${level + 1}${isCurrentlySelected ? ' ✓' : ''}` 
                : `🔒 Nivo ${level + 1}`;
            
            const txt = this.add.text(
                width / 2, 
                gridStartY + i * spacingY,
                labelText,
                {
                    fontSize: '24px',
                    color: '#ffffff',
                    fontStyle: isCurrentlySelected ? 'bold' : 'normal'
                }
            ).setOrigin(0.5);
            
            // Make selectable only if unlocked
            if (unlocked) {
                bg.setInteractive({ useHandCursor: true })
                    .on('pointerover', () => {
                        if (level !== selectedLevel) {
                            bg.setFillStyle(0x388E3C);
                        }
                    })
                    .on('pointerout', () => {
                        if (level === selectedLevel) {
                            bg.setFillStyle(0x2E7D32);
                        } else {
                            bg.setFillStyle(0x4CAF50);
                        }
                    })
                    .on('pointerdown', () => {
                        // Save the selected level (but don't change highest reached)
                        localStorage.setItem('currentChallengeIndex', level.toString());
                        
                        // Fade and switch to workspace
                        this.cameras.main.fade(250, 0, 0, 0);
                        this.time.delayedCall(250, () => {
                            this.scene.start('WorkspaceScene');
                        });
                    });
            }
        }
        
        // BACK button
        const backButton = this.add.text(20, 20, '↩ Nazaj na delavnico', {
            fontSize: '22px',
            color: '#00aaff'
        })
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => backButton.setColor('#0088dd'))
            .on('pointerout', () => backButton.setColor('#00aaff'))
            .on('pointerdown', () => {
                this.scene.start('WorkspaceScene');
            });
    }
}