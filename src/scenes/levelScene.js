import Phaser from 'phaser';

export default class LevelScene extends Phaser.Scene {
    constructor() {
        super('LevelScene');
    }
    
    preload() {}
    
    create() {
        const { width, height } = this.cameras.main;
        
        // Get the highest level reached for both circuit and logic
        const highestCircuitLevel = localStorage.getItem('highestCircuitChallengeIndex');
        const highestLogicLevel = localStorage.getItem('highestLogicChallengeIndex');
        
        const maxCircuitLevel = highestCircuitLevel !== null ? parseInt(highestCircuitLevel) : 0;
        const maxLogicLevel = highestLogicLevel !== null ? parseInt(highestLogicLevel) : 0;
        
        // Get current selections
        const currentCircuitSelected = localStorage.getItem('currentCircuitChallengeIndex');
        const currentLogicSelected = localStorage.getItem('currentLogicChallengeIndex');
        
        const selectedCircuitLevel = currentCircuitSelected !== null ? parseInt(currentCircuitSelected) : 0;
        const selectedLogicLevel = currentLogicSelected !== null ? parseInt(currentLogicSelected) : 0;
        
        // Title
        this.add.text(width / 2, 40, 'Izberite nivo', {
            fontSize: '40px',
            color: '#000000',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        // Circuit Levels Section
        this.add.text(width / 4, 100, 'ELEKTRČNI KROGI', {
            fontSize: '24px',
            color: '#0066cc',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        // Logic Levels Section
        this.add.text(3 * width / 4, 100, 'LOGIČNA VRATA', {
            fontSize: '24px',
            color: '#9933cc',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        // Create circuit level buttons (8 levels)
        const circuitLevels = 8;
        const gridStartY = 150;
        const spacingY = 60;
        
        for (let i = 0; i < circuitLevels; i++) {
            const level = i;
            const unlocked = level <= maxCircuitLevel;
            const isCurrentlySelected = level === selectedCircuitLevel;
            
            let bgColor;
            if (!unlocked) {
                bgColor = 0x555555; // Locked
            } else if (isCurrentlySelected) {
                bgColor = 0x2E7D32; // Selected
            } else {
                bgColor = 0x4CAF50; // Unlocked
            }
            
            const xPos = width / 4;
            const yPos = gridStartY + i * spacingY;
            
            const bg = this.add.rectangle(
                xPos, 
                yPos, 
                250, 
                40,
                bgColor, 
                1
            ).setStrokeStyle(isCurrentlySelected ? 4 : 2, isCurrentlySelected ? 0xFFEB3B : 0xffffff);
            
            const labelText = unlocked 
                ? `Krog ${level + 1}${isCurrentlySelected ? ' ✓' : ''}` 
                : `🔒 Krog ${level + 1}`;
            
            const txt = this.add.text(
                xPos, 
                yPos,
                labelText,
                {
                    fontSize: '18px',
                    color: '#ffffff',
                    fontStyle: isCurrentlySelected ? 'bold' : 'normal'
                }
            ).setOrigin(0.5);
            
            // Make selectable only if unlocked
            if (unlocked) {
                bg.setInteractive({ useHandCursor: true })
                    .on('pointerover', () => {
                        if (level !== selectedCircuitLevel) {
                            bg.setFillStyle(0x388E3C);
                        }
                    })
                    .on('pointerout', () => {
                        if (level === selectedCircuitLevel) {
                            bg.setFillStyle(0x2E7D32);
                        } else {
                            bg.setFillStyle(0x4CAF50);
                        }
                    })
                    .on('pointerdown', () => {
                        // Save the selected circuit level
                        localStorage.setItem('currentCircuitChallengeIndex', level.toString());
                        
                        // Fade and switch to workspace
                        this.cameras.main.fade(250, 0, 0, 0);
                        this.time.delayedCall(250, () => {
                            this.scene.start('WorkspaceScene');
                        });
                    });
            }
        }
        const logicLevels = 6;

        // Create logic level buttons
        for (let i = 0; i < logicLevels; i++) {
        const level = i;
        const unlocked = level <= maxLogicLevel;
        const isCurrentlySelected = level === selectedLogicLevel;
        
        let bgColor;
        if (!unlocked) {
            bgColor = 0x555555; // Locked
        } else if (isCurrentlySelected) {
            bgColor = 0x7B1FA2; // Selected (purple)
        } else {
            bgColor = 0x9C27B0; // Unlocked (purple)
        }
        
        const xPos = 3 * width / 4;
        const yPos = gridStartY + i * spacingY;
        
        const bg = this.add.rectangle(
            xPos, 
            yPos, 
            250, 
            40,
            bgColor, 
            1
        ).setStrokeStyle(isCurrentlySelected ? 4 : 2, isCurrentlySelected ? 0xFFEB3B : 0xffffff);
        
        const gateNames = ['NOT', 'AND', 'OR', 'NOR', 'XOR']; // Keep 5 names for backward compatibility
        const labelText = unlocked 
            ? `${i === 0 ? 'NAND + NOT' : gateNames[i-1] || `Level ${i+1}`}${isCurrentlySelected ? ' ✓' : ''}` 
            : `🔒 ${i === 0 ? 'NOT' : gateNames[i-1] || `Level ${i+1}`}`;
            const txt = this.add.text(
                xPos, 
                yPos,
                labelText,
                {
                    fontSize: '18px',
                    color: '#ffffff',
                    fontStyle: isCurrentlySelected ? 'bold' : 'normal'
                }
            ).setOrigin(0.5);
            
            // Make selectable only if unlocked
            if (unlocked) {
                bg.setInteractive({ useHandCursor: true })
                    .on('pointerover', () => {
                        if (level !== selectedLogicLevel) {
                            bg.setFillStyle(0x8E24AA);
                        }
                    })
                    .on('pointerout', () => {
                        if (level === selectedLogicLevel) {
                            bg.setFillStyle(0x7B1FA2);
                        } else {
                            bg.setFillStyle(0x9C27B0);
                        }
                    })
                    .on('pointerdown', () => {
                        // Save the selected logic level
                        localStorage.setItem('currentLogicChallengeIndex', level.toString());
                        
                        // Fade and switch to logic scene
                        this.cameras.main.fade(250, 0, 0, 0);
                        this.time.delayedCall(250, () => {
                            this.scene.start('LogicScene');
                        });
                    });
            }
        }
        // Reset progress button
        const resetButton = this.add.text(width - 20, 20, '♻ Ponastavi napredek', {
            fontSize: '18px',
            color: '#ff4444'
        })
            .setOrigin(1, 0)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => resetButton.setColor('#cc0000'))
            .on('pointerout', () => resetButton.setColor('#ff4444'))
            .on('pointerdown', () => {
                // Clear all progress
                localStorage.removeItem('highestCircuitChallengeIndex');
                localStorage.removeItem('currentCircuitChallengeIndex');
                localStorage.removeItem('highestLogicChallengeIndex');
                localStorage.removeItem('currentLogicChallengeIndex');
                localStorage.removeItem('unlockedLogicGates'); // Add this line
                
                // Also clear any user-specific progress if you have it
                const user = localStorage.getItem('username');
                if (user) {
                    const users = JSON.parse(localStorage.getItem('users')) || [];
                    const userData = users.find(u => u.username === user);
                    if (userData) {
                        userData.score = 0; // Reset score too if you want
                        // Reset any other user-specific progress
                        localStorage.setItem('users', JSON.stringify(users));
                    }
                }
                
                // Reload scene
                this.scene.restart();
            });
        // BACK button
        const backButton = this.add.text(20, 20, '↩ Nazaj na izbiro', {
            fontSize: '22px',
            color: '#00aaff'
        })
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => backButton.setColor('#0088dd'))
            .on('pointerout', () => backButton.setColor('#00aaff'))
            .on('pointerdown', () => {
                // Go back to main menu or lab scene
                this.scene.start('LabScene');
            });
            
        // Info text
        this.add.text(width / 2, height - 50, 
            '💡 Zeleno: Električni krogi | Vijolično: Logična vrata', {
            fontSize: '16px',
            color: '#666666'
        }).setOrigin(0.5);
    }
}