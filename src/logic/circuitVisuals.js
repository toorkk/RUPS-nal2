/**
 * CircuitVisuals - Handles visual effects for circuit components
 * Includes glow effects, tints, and component value displays
 */
class CircuitVisuals {
  constructor(scene) {
    this.scene = scene;
  }

  /**
   * Update visuals for all placed components based on simulation result
   */
  updateComponentVisuals(result, placedComponents, graph) {
    if (!result) return;

    for (const placedComp of placedComponents) {
      const logicComp = placedComp.getData('logicComponent');
      if (!logicComp) continue;

      const type = placedComp.getData('type');

      if (type === 'svetilka') {
        this.updateBulbVisual(placedComp, logicComp, result);
      } else if (type === 'upor') {
        this.updateResistorVisual(placedComp, logicComp, result);
      }
    }
  }

  /**
   * Update bulb visual - glow effect based on brightness
   */
  updateBulbVisual(placedComp, logicComp, result) {
    const image = placedComp.list.find(child => child.type === 'Image');
    if (!image) {
      console.log(`Bulb: No image found in container!`);
      return;
    }

    console.log(`=== Bulb Visual Update ===`);
    console.log(`  ID: ${logicComp.id}`);
    console.log(`  is_on: ${logicComp.is_on}`);
    console.log(`  brightness: ${logicComp.brightness}`);
    console.log(`  result.closed: ${result.closed}`);

    if (result.closed && logicComp.is_on) {
      const brightness = logicComp.brightness || 50;
      console.log(`  Applying glow with brightness: ${brightness}%`);
      
      // Calculate tint based on brightness (yellow glow)
      const glowIntensity = Math.floor((brightness / 100) * 255);
      const tint = Phaser.Display.Color.GetColor(255, 255, 128 + Math.floor(glowIntensity * 0.5));
      
      image.setTint(tint);
      
      // Add glow effect
      if (!placedComp.getData('glowEffect')) {
        const glow = this.scene.add.circle(placedComp.x, placedComp.y, 28, 0xffff00, 0.5);
        glow.setDepth(5);
        placedComp.setData('glowEffect', glow);
        console.log(`  Created NEW glow at (${placedComp.x}, ${placedComp.y})`);
      }
      
      const glow = placedComp.getData('glowEffect');
      if (glow) {
        const alpha = 0.3 + (brightness / 100) * 0.5;
        glow.setAlpha(alpha);
        glow.setPosition(placedComp.x, placedComp.y);
        glow.setVisible(true);
        
        // Kill existing tweens before adding new
        this.scene.tweens.killTweensOf(glow);
        
        // Pulsing glow animation
        this.scene.tweens.add({
          targets: glow,
          alpha: { from: alpha * 0.6, to: alpha },
          duration: 500,
          yoyo: true,
          repeat: -1
        });
        console.log(`  Glow set to alpha ${alpha}`);
      }
      
    } else if (logicComp.burnedOut) {
      console.log(`  Bulb is burned out`);
      image.setTint(0x333333);
      this.showComponentValue(placedComp, '💥');
      this.removeGlowEffect(placedComp);
      
    } else {
      console.log(`  Bulb is OFF - clearing effects`);
      image.clearTint();
      this.removeGlowEffect(placedComp);
      this.hideComponentValue(placedComp);
    }
  }

  /**
   * Update resistor visual - color based on heat/power
   */
  updateResistorVisual(placedComp, logicComp, result) {
    const image = placedComp.list.find(child => child.type === 'Image');
    if (!image) return;

    if (result.closed && result.componentDetails) {
      const detail = result.componentDetails.find(d => d.id === logicComp.id);
      if (detail) {
        const voltageDrop = Math.abs(detail.voltage || detail.voltageDrop || 0);
        const current = Math.abs(detail.current || 0);
        
        // Color based on power dissipation (heat)
        const power = current * voltageDrop;
        if (power > 0.5) {
          image.setTint(0xff6600); // Orange - hot
        } else if (power > 0.2) {
          image.setTint(0xffaa00); // Yellow-orange - warm
        } else {
          image.clearTint();
        }
      }
    } else {
      image.clearTint();
      this.hideComponentValue(placedComp);
    }
  }

  /**
   * Show a value label above a component
   */
  showComponentValue(placedComp, value) {
    let valueText = placedComp.getData('valueText');
    
    if (!valueText) {
      valueText = this.scene.add.text(placedComp.x, placedComp.y - 50, value, {
        fontSize: '12px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 4, y: 2 }
      }).setOrigin(0.5).setDepth(200);
      placedComp.setData('valueText', valueText);
    } else {
      valueText.setText(value);
      valueText.setPosition(placedComp.x, placedComp.y - 50);
      valueText.setVisible(true);
    }
  }

  /**
   * Hide value label for a component
   */
  hideComponentValue(placedComp) {
    const valueText = placedComp.getData('valueText');
    if (valueText) {
      valueText.setVisible(false);
    }
  }

  /**
   * Remove glow effect from a component
   */
  removeGlowEffect(placedComp) {
    const glow = placedComp.getData('glowEffect');
    if (glow) {
      this.scene.tweens.killTweensOf(glow);
      glow.destroy();
      placedComp.setData('glowEffect', null);
    }
  }

  /**
   * Reset all visual effects for placed components
   */
  resetAllVisuals(placedComponents) {
    for (const placedComp of placedComponents) {
      this.removeGlowEffect(placedComp);
      this.hideComponentValue(placedComp);
      
      const image = placedComp.list.find(child => child.type === 'Image');
      if (image) {
        image.clearTint();
      }
    }
  }
}

export { CircuitVisuals };