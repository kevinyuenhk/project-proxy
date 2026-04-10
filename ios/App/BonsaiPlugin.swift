import Foundation
import Capacitor
import BonsaiEngine

/// Capacitor plugin bridging the Bonsai LLM engine to the web frontend.
@objc(BonsaiPlugin)
public class BonsaiPlugin: CAPPlugin {

    private let engine = BonsaiEngine()

    // MARK: - Load Model

    @objc func loadModel(_ call: CAPPluginCall) {
        guard let modelId = call.getString("modelId") else {
            call.reject("modelId is required")
            return
        }

        Task {
            do {
                try await engine.loadModel(modelId: modelId)
                call.resolve([
                    "modelId": modelId,
                    "loaded": true
                ])
            } catch {
                call.reject("Failed to load model: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Generate (Full)

    @objc func generate(_ call: CAPPluginCall) {
        guard let prompt = call.getString("prompt") else {
            call.reject("prompt is required")
            return
        }
        let systemPrompt = call.getString("systemPrompt")

        Task {
            do {
                let response = try await engine.generate(
                    prompt: prompt,
                    systemPrompt: systemPrompt
                )
                call.resolve(["text": response])
            } catch {
                call.reject("Generation failed: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Stream

    @objc func startStream(_ call: CAPPluginCall) {
        guard let prompt = call.getString("prompt") else {
            call.reject("prompt is required")
            return
        }
        let systemPrompt = call.getString("systemPrompt")

        Task {
            do {
                // Notify web that streaming has started
                notifyListeners("streamStart", data: [:])

                try await engine.stream(
                    prompt: prompt,
                    systemPrompt: systemPrompt
                ) { [weak self] token in
                    self?.notifyListeners("streamToken", data: [
                        "token": token
                    ])
                }

                // Notify completion
                notifyListeners("streamEnd", data: [:])
                call.resolve()
            } catch {
                notifyListeners("streamError", data: [
                    "error": error.localizedDescription
                ])
                call.reject("Stream failed: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Stop

    @objc func stopGeneration(_ call: CAPPluginCall) {
        Task {
            await engine.stopGeneration()
            notifyListeners("streamEnd", data: ["reason": "stopped"])
            call.resolve()
        }
    }

    // MARK: - Model Info

    @objc func getModels(_ call: CAPPluginCall) {
        Task {
            let models = await engine.getModels()
            call.resolve([
                "models": models
            ])
        }
    }

    @objc func isLoaded(_ call: CAPPluginCall) {
        Task {
            let loaded = await engine.isModelLoaded
            let modelId = await engine.currentModelId
            call.resolve([
                "loaded": loaded,
                "modelId": modelId as Any
            ])
        }
    }
}
