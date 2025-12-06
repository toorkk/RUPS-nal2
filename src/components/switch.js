import { Component } from "./component.js";

class Switch extends Component {
    constructor(id, start, end, is_on = false) {
        if (is_on)
            super(id, 'switch', start, end, 'src/components/switch-on.png', false);
        else
            super(id, 'switch', start, end, 'src/components/switch-off.png', false);
        this.is_on = is_on;
        this.resistance = 0.5;  // 0.5Ω - zelo majhen upor ko je zaprto
    }

    toggle() {
        this.is_on = !this.is_on;
        console.log(`🔌 Switch ${this.id} is now ${this.is_on ? 'ON' : 'OFF'}`);
    }
}

export { Switch };