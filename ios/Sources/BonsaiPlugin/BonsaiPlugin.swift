import Foundation
import Capacitor

/// Capacitor plugin bridging the web frontend to the native BonsaiEngine.
///
/// Register this plugin in your AppDelegate or via auto-registration.
@objc(BonsaiPlugin)
public class BonsaiPlugin: CAPPlugin {

    private lazy var engine = BonsaiEngine()

    // MARK: - Load Model

    @objc func loadModel(_ call: CAPPluginCall) {
        guard let modelId = call.getString("modelId") else {
            call.reject("modelId is required")
            return
        }

        Task {
            do {
                try await self.engine.loadModel(modelId)
                call.resolve(["success": true])
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    // MARK: - Generate

    @objc func generate(_ call: CAPPluginCall) {
        guard let messages = call.getArray("messages", [String: String].self) else {
            call.reject("messages is required")
            return
        }

        let systemPrompt = call.getString("systemPrompt")
        let stream = call.getBool("stream") ?? false

        Task {
            do {
                if stream {
                    let result = try await self.engine.generateStream(
                        messages: messages,
                        systemPrompt: systemPrompt
                    ) { token in
                        self.notifyListeners("streamToken", data: [
                            "token": token,
                            "done": false,
                        ])
                    }

                    self.notifyListeners("streamToken", data: [
                        "token": "",
                        "done": true,
                        "fullText": result,
                    ])
                    call.resolve(["text": result])
                } else {
                    let text = try await self.engine.generate(
                        messages: messages,
                        systemPrompt: systemPrompt
                    )
                    call.resolve(["text": text])
                }
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    // MARK: - Stop Generation

    @objc func stopGeneration(_ call: CAPPluginCall) {
        Task {
            await self.engine.stopGeneration()
            call.resolve()
        }
    }

    // MARK: - Model Info

    @objc func getModels(_ call: CAPPluginCall) {
        let models = engine.getModels()
        call.resolve(["models": models])
    }

    @objc func getLoadedModel(_ call: CAPPluginCall) {
        if let model = engine.getLoadedModel() {
            call.resolve([
                "id": model.id,
                "displayName": model.displayName,
                "sizeBytes": model.sizeBytes,
            ])
        } else {
            call.resolve(["loaded": false])
        }
    }

    // MARK: - Performance

    @objc func getPerformance(_ call: CAPPluginCall) {
        let perf = engine.getPerformance()
        call.resolve(perf)
    }
}
