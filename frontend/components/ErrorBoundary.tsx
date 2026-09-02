import { Component, type PropsWithChildren, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = PropsWithChildren<{ fallback?: ReactNode }>;
type State = { error: Error | null };

// Prevents an uncaught render error from silently producing a blank white screen in production.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("Unhandled render error", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <View style={styles.container}>
            <Text style={styles.title}>Algo salió mal</Text>
            <Text style={styles.message}>{this.state.error.message}</Text>
          </View>
        )
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    padding: 24,
    gap: 8
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f3b73"
  },
  message: {
    fontSize: 14,
    color: "#4b5563",
    textAlign: "center"
  }
});
