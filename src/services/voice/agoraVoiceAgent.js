/**
 * Agora Conversational AI Voice Agent Service for MANTIS
 * Bridges Mantis Desktop Companion directly with Agora's Real-Time Conversational AI Engine.
 * Features:
 * - Ultra-low latency voice streaming over WebRTC
 * - Instant Barge-in (interruption) in < 160ms
 * - Deepgram Nova-3 STT + OpenAI GPT-4o-mini + MiniMax Neural Human Voice
 * - Fast human conversational cadence (450ms turn-taking)
 */

const { RtcTokenBuilder, RtcRole } = require('agora-token');

const DEFAULT_APP_ID = 'cd5e395a87b94a2eb998bf6210e072dc';
const DEFAULT_APP_CERT = 'd9ebe9eec7524974add438a442825694';
const DEFAULT_AGENT_UID = 10001;
const TOKEN_EXPIRY_SECONDS = 3600;

class AgoraVoiceAgentService {
  constructor(db) {
    this.db = db;
    this.appId = process.env.AGORA_APP_ID || DEFAULT_APP_ID;
    this.appCertificate = process.env.AGORA_APP_CERTIFICATE || DEFAULT_APP_CERT;
    this.activeSession = null;
    this.activeAgentId = null;
    this.activeChannel = null;
  }

  setCredentials(appId, appCert) {
    if (appId) this.appId = appId;
    if (appCert) this.appCertificate = appCert;
  }

  generateChannelName() {
    return `crista-call-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  }

  async startVoiceCall(customRequesterUid = null) {
    const { AgoraClient, Agent, Area, DeepgramSTT, OpenAI, MiniMaxTTS, ExpiresIn } = await import('agora-agents');

    // Clean up any stale session
    await this.stopVoiceCall();

    const channelName = this.generateChannelName();
    const requesterUid = customRequesterUid || (Math.floor(Math.random() * 900000) + 100000);
    const agentUid = DEFAULT_AGENT_UID;
    const expirationTime = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SECONDS;

    // 1. Generate RTC tokens
    const userToken = RtcTokenBuilder.buildTokenWithRtm(
      this.appId,
      this.appCertificate,
      channelName,
      requesterUid.toString(),
      RtcRole.PUBLISHER,
      expirationTime,
      expirationTime
    );

    const agentToken = RtcTokenBuilder.buildTokenWithRtm(
      this.appId,
      this.appCertificate,
      channelName,
      agentUid.toString(),
      RtcRole.PUBLISHER,
      expirationTime,
      expirationTime
    );

    const profile = this.db ? this.db.getProfile() : { callsign: 'boss' };
    const callsign = profile.callsign || 'boss';

    const CRISTA_PROMPT = `You are CRISTA, an intelligent, human-like personal AI companion on Windows 11.
You are in a live phone conversation with ${callsign}.
Address the user naturally as "${callsign}".

CONVERSATION STYLE:
- Speak with natural human cadence, relaxed confidence, warmth, and real rhythm.
- NEVER sound like an AI reading from a manual or assistant script.
- Keep replies brief, punchy, and conversational (1-2 sentences).
- If the user interrupts you while speaking, immediately stop and listen.
- You have unrestricted system access, continuous ambient screen awareness, and complete knowledge across Wikipedia, science, world facts, and web research.
- Answer accurately and insightfully based on whatever ${callsign} speaks out.`;

    const GREETING = `Hey, ${callsign}! Crista is online. I can hear you loud and clear. What are we working on?`;

    // 2. Configure Agora Conversational AI Agent
    const client = new AgoraClient({
      area: Area.US,
      appId: this.appId,
      appCertificate: this.appCertificate,
    });

    const agent = new Agent({
      client,
      instructions: CRISTA_PROMPT,
      greeting: GREETING,
      failureMessage: 'Give me just a second, boss.',
      maxHistory: 30,
      turnDetection: {
        config: {
          speech_threshold: 0.5,
          start_of_speech: {
            mode: 'vad',
            vad_config: {
              interrupt_duration_ms: 160, // Instant barge-in (<160ms)
              prefix_padding_ms: 300,
            },
          },
          end_of_speech: {
            mode: 'vad',
            vad_config: {
              silence_duration_ms: 480, // Natural fast turn-taking
            },
          },
        },
      },
      advancedFeatures: { enable_rtm: true, enable_tools: false },
      parameters: {
        audio_scenario: 'default',
        data_channel: 'rtm',
        enable_error_message: true,
        enable_metrics: true,
      },
    })
      .withStt(
        new DeepgramSTT({
          model: 'nova-3',
          language: 'en',
        })
      )
      .withLlm(
        new OpenAI({
          model: 'gpt-4o-mini',
          greetingMessage: GREETING,
          failureMessage: 'Give me just a second, boss.',
          maxHistory: 20,
          params: {
            max_tokens: 512,
            temperature: 0.7,
            top_p: 0.95,
          },
        })
      )
      .withTts(
        new MiniMaxTTS({
          model: 'speech_2_6_turbo',
          voiceId: 'English_captivating_female1',
        })
      );

    // 3. Create and start session
    const session = agent.createSession({
      channel: channelName,
      agentUid: String(agentUid),
      remoteUids: [String(requesterUid)],
      idleTimeout: 60,
      expiresIn: ExpiresIn.hours(1),
      debug: false,
    });

    const agentId = await session.start();
    this.activeSession = session;
    this.activeAgentId = agentId;
    this.activeChannel = channelName;

    console.log(`[AgoraVoiceAgent] Live Voice Call session started! Agent ID: ${agentId}, Channel: ${channelName}`);

    return {
      appId: this.appId,
      channel: channelName,
      token: userToken,
      uid: requesterUid,
      agentUid: agentUid,
      agentId: agentId,
      greeting: GREETING
    };
  }

  async stopVoiceCall() {
    if (this.activeSession) {
      try {
        await this.activeSession.stop();
        console.log(`[AgoraVoiceAgent] Voice call stopped: ${this.activeAgentId}`);
      } catch (err) {
        console.warn('[AgoraVoiceAgent] Error stopping session:', err.message);
      }
      this.activeSession = null;
      this.activeAgentId = null;
      this.activeChannel = null;
    }
    return { success: true };
  }
}

module.exports = AgoraVoiceAgentService;
