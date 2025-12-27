/**
 * Spiral Generator - Converts comma-separated words into spiral text layout
 * Converted from Ruby script for PDF generation
 */

class SpiralGenerator {
  /**
   * Generate spiral layout from comma-separated words
   * @param {string} input - Comma-separated words
   * @returns {string} - Spiral formatted text
   */
  static generateSpiral(input) {
    if (!input || typeof input !== 'string') {
      return '';
    }

    // Split words by comma and clean them
    const words = input.split(',')
      .map(word => word.trim())
      .filter(word => word.length > 0);

    if (words.length === 0) {
      return '';
    }

    return this.spiral([...words]);
  }

  /**
   * Create spiral layout from array of words
   * @param {string[]} words - Array of words
   * @returns {string} - Spiral formatted text
   */
  static spiral(words) {
    words = [...words]; // Create copy to avoid mutation
    
    let result = [`>>> | ${words.shift()}`];
    result = this.align(result, 'right');
    
    let direction = 2;
    // 0 TOP
    // 1 RIGHT  
    // 2 BOTTOM
    // 3 LEFT

    while (words.length > 0) {
      switch (direction) {
        case 0: // TOP → add row below
          {
            const target = result[0].length;
            const gap = result[result.length - 1].split('|')[0].length + 1;
            result = this.align(result, 'right');
            
            const row = [this.insertChars(' ', gap)];
            while ((row.join(' ').length < target || row.length < 2) && words.length > 0) {
              if (words.length === 0) break;
              row.push(words.shift());
            }
            
            const separator = this.insertChars(' ', gap) + 
                            this.insertChars('-', row.join(' ').length + 3 - gap);
            result.push(separator);
            result.push(row.join(' '));
            result = this.align(result, 'left');
          }
          break;

        case 1: // RIGHT → add column to the right
          {
            for (let i = 2; i <= result.length - 1; i++) {
              if (words.length === 0) break;
              const idx = result.length - 1 - i;
              result[idx] += `| ${words.shift()}`;
            }
            result = this.align(result, 'left');
          }
          break;

        case 2: // BOTTOM → add row above
          {
            const target = result[result.length - 1].length;
            const gap = result[0].split('|').pop().length + 1;
            
            const row = [this.insertChars(' ', gap)];
            while ((row.join(' ').length < target || row.length < 2) && words.length > 0) {
              row.unshift(words.shift());
            }
            
            const separator = this.insertChars('-', row.join(' ').length + 3 - gap) + 
                              this.insertChars(' ', gap);
            result.unshift(separator);
            result.unshift(row.join(' '));
            result = this.align(result, 'right');
          }
          break;

        case 3: // LEFT → add column to the left
          {
            for (let i = 2; i <= result.length - 1; i++) {
              if (words.length === 0) break;
              result[i] = `${words.shift()} |${result[i]}`;
            }
            result = this.align(result, 'right');
          }
          break;
      }
      
      direction = (direction + 1) % 4;
    }

    // A little ASCII snail head appears here
    const separator = this.insertChars(' ', result[0].length + 3) 
    result.push(separator + "     \\/")
    result.push(separator + "_____(oo)")

    return result.join('\n');
  }

  /**
   * Align lines to left or right
   * @param {string[]} lines - Array of lines
   * @param {string} direction - 'left' or 'right'
   * @returns {string[]} - Aligned lines
   */
  static align(lines, direction) {
    const max = Math.max(...lines.map(line => line.length));
    
    return lines.map(line => {
      if (direction === 'left') {
        return line.padEnd(max, ' ');
      } else {
        return line.padStart(max, ' ');
      }
    });
  }

  /**
   * Insert character n times
   * @param {string} char - Character to repeat
   * @param {number} n - Number of repetitions
   * @returns {string} - Repeated character
   */
  static insertChars(char, n) {
    return char.repeat(Math.max(0, n));
  }
}

module.exports = SpiralGenerator;