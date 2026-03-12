import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../../src/components/ThemedText';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { useThemeStore, getTheme } from '../../src/stores/themeStore';
import { useAuthStore } from '../../src/stores/authStore';
import { api } from '../../src/utils/api';
import { AIResponse, User } from '../../src/types';
import { Ionicons } from '@expo/vector-icons';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestions?: AIResponse['suggestions'];
  action_required?: boolean;
  action_type?: string;
}

const SUGGESTIONS = [
  "Build my team for a fintech hackathon. I need React and backend developers.",
  "Find me teammates who know machine learning",
  "I'm looking for a UI/UX designer for my startup",
  "Help me find collaborators for a mobile app project",
];

export default function AIBuilder() {
  const isDark = useThemeStore((state) => state.isDark);
  const theme = getTheme(isDark);
  const { user } = useAuthStore();
  const scrollRef = useRef<ScrollView>(null);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hi ${user?.name || 'there'}! I'm your AI Team Building Assistant. I can help you:\n\n• Find suitable teammates based on skills\n• Suggest role distributions for your team\n• Draft introduction messages\n• Recommend next steps\n\nWhat kind of team are you looking to build?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: string; data: any } | null>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response: AIResponse = await api.aiTeamBuilder(messageText);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        suggestions: response.suggestions,
        action_required: response.action_required,
        action_type: response.action_type,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (response.action_required && response.action_type) {
        setPendingAction({
          type: response.action_type,
          data: response.suggestions,
        });
      }
    } catch (error) {
      console.error('AI error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'I apologize, but I encountered an error. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAction = async () => {
    if (!pendingAction) return;
    
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Great! I\'ll proceed with the action. You can view your sent invites in the Teams section.',
      },
    ]);
    setPendingAction(null);
  };

  const handleDeclineAction = () => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'No problem! Let me know if you\'d like me to suggest different team members or help with something else.',
      },
    ]);
    setPendingAction(null);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View style={[styles.aiIcon, { backgroundColor: theme.primary }]}>
            <Ionicons name="sparkles" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.headerText}>
            <ThemedText weight="semibold" size="lg">AI Team Builder</ThemedText>
            <ThemedText variant="secondary" size="sm">Powered by Claude</ThemedText>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageBubble,
                message.role === 'user'
                  ? [styles.userBubble, { backgroundColor: theme.primary }]
                  : [styles.assistantBubble, { backgroundColor: theme.surface }],
              ]}
            >
              <ThemedText
                style={message.role === 'user' ? { color: '#FFFFFF' } : undefined}
              >
                {message.content}
              </ThemedText>

              {/* Show suggestions */}
              {message.suggestions && message.suggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <ThemedText variant="secondary" size="sm" style={styles.suggestionsTitle}>
                    Suggested Team Members:
                  </ThemedText>
                  {message.suggestions.map((suggestion, idx) => (
                    <Card key={idx} style={[styles.suggestionCard, { backgroundColor: theme.surfaceVariant }]}>
                      <ThemedText weight="semibold">{suggestion.name}</ThemedText>
                      <ThemedText variant="secondary" size="sm">
                        Skills: {suggestion.skills?.map(s => typeof s === 'string' ? s : s.name).join(', ')}
                      </ThemedText>
                    </Card>
                  ))}
                </View>
              )}

              {/* Action approval */}
              {message.action_required && pendingAction && (
                <View style={styles.actionContainer}>
                  <ThemedText variant="secondary" size="sm" style={styles.actionText}>
                    Would you like me to proceed with sending invites?
                  </ThemedText>
                  <View style={styles.actionButtons}>
                    <Button
                      title="No, thanks"
                      variant="outline"
                      size="sm"
                      onPress={handleDeclineAction}
                    />
                    <Button
                      title="Yes, proceed"
                      size="sm"
                      onPress={handleApproveAction}
                    />
                  </View>
                </View>
              )}
            </View>
          ))}

          {loading && (
            <View style={[styles.messageBubble, styles.assistantBubble, { backgroundColor: theme.surface }]}>
              <ActivityIndicator color={theme.primary} />
            </View>
          )}

          {/* Quick suggestions */}
          {messages.length === 1 && (
            <View style={styles.quickSuggestions}>
              <ThemedText variant="secondary" size="sm" style={styles.quickSuggestionsTitle}>
                Try asking:
              </ThemedText>
              {SUGGESTIONS.map((suggestion, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.quickSuggestion, { borderColor: theme.border }]}
                  onPress={() => handleSend(suggestion)}
                >
                  <ThemedText size="sm">{suggestion}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={[styles.inputContainer, { borderTopColor: theme.border }]}>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border },
            ]}
            placeholder="Ask me about team building..."
            placeholderTextColor={theme.textTertiary}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: input.trim() ? theme.primary : theme.surfaceVariant },
            ]}
            onPress={() => handleSend()}
            disabled={!input.trim() || loading}
          >
            <Ionicons
              name="send"
              size={20}
              color={input.trim() ? '#FFFFFF' : theme.textTertiary}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  aiIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 12,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  suggestionsContainer: {
    marginTop: 12,
    gap: 8,
  },
  suggestionsTitle: {
    marginBottom: 4,
  },
  suggestionCard: {
    padding: 12,
  },
  actionContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  actionText: {
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  quickSuggestions: {
    marginTop: 16,
    gap: 8,
  },
  quickSuggestionsTitle: {
    marginBottom: 4,
  },
  quickSuggestion: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
    borderWidth: 1,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
