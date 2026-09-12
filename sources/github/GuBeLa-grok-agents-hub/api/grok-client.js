/**
 * Grok API Client
 * Wrapper for interacting with Grok API (x.ai/api)
 */

const axios = require('axios');
require('dotenv').config();

class GrokClient {
  constructor(apiKey = null) {
    this.apiKey = apiKey || process.env.GROK_API_KEY;
    this.baseURL = process.env.GROK_API_ENDPOINT || 'https://api.x.ai/v1';
    this.timeout = parseInt(process.env.GROK_API_TIMEOUT) || 30000;
    
    if (!this.apiKey) {
      throw new Error('GROK_API_KEY is required. Set it in .env file or pass as parameter.');
    }
    
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: this.timeout
    });
  }

  /**
   * Chat completion using Grok
   * @param {string} prompt - The prompt to send
   * @param {object} options - Additional options (temperature, max_tokens, etc.)
   * @returns {Promise<object>} Response from Grok API
   */
  async chat(prompt, options = {}) {
    try {
      const response = await this.client.post('/chat/completions', {
        model: options.model || 'grok-beta',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 2000,
        ...options
      });
      
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`Grok API Error: ${error.response.status} - ${error.response.data?.error?.message || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Use an agent from the hub
   * @param {string} agentPath - Path to agent JSON file
   * @param {string} userInput - User input for the agent
   * @returns {Promise<object>} Response from Grok
   */
  async useAgent(agentPath, userInput) {
    const fs = require('fs-extra');
    const path = require('path');
    const os = require('os');
    
    const agentFile = path.join(os.homedir(), '.grok-agents', agentPath + '.json');
    
    if (!await fs.pathExists(agentFile)) {
      throw new Error(`Agent not found: ${agentPath}. Install it first using: grok-agents-hub install ${agentPath}`);
    }
    
    const agent = await fs.readJson(agentFile);
    const fullPrompt = `${agent.prompt}\n\nUser Input: ${userInput}`;
    
    return this.chat(fullPrompt, agent.config || {});
  }

  /**
   * Stream chat completion
   * @param {string} prompt - The prompt to send
   * @param {object} options - Additional options
   * @returns {AsyncGenerator} Stream of responses
   */
  async *streamChat(prompt, options = {}) {
    try {
      const response = await this.client.post('/chat/completions', {
        model: options.model || 'grok-beta',
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 2000,
        stream: true,
        ...options
      }, {
        responseType: 'stream'
      });
      
      for await (const chunk of response.data) {
        const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;
            try {
              const json = JSON.parse(data);
              yield json;
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      throw new Error(`Streaming error: ${error.message}`);
    }
  }
}

module.exports = GrokClient;

