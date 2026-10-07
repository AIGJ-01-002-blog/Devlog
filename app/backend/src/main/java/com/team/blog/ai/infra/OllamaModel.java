package com.team.blog.ai.infra;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

import com.team.blog.ai.application.AiProperties;
import com.team.blog.ai.application.TagModel;
import com.team.blog.ai.application.TagPrompt;

/** 자체 AI: 우리 서버의 Ollama /api/chat (018 FR-014). 외부로 나가지 않는다. 응답 형식은 JSON Schema로 건다. */
@Component
class OllamaModel implements TagModel {
    private final AiProperties.Local props;
    private final JsonMapper json = JsonMapper.builder().build();

    OllamaModel(AiProperties props) {
        this.props = props.local();
    }

    @Override
    public Provider provider() {
        return Provider.LOCAL;
    }

    @Override
    public boolean configured() {
        return props.configured();
    }

    @Override
    public int maxChars() {
        return props.maxChars();
    }

    @Override
    public List<String> suggest(Prompt prompt) throws ModelException {
        ObjectNode body = json.createObjectNode();
        body.put("model", props.model());
        body.put("stream", false);
        ArrayNode messages = body.putArray("messages");
        messages.addObject().put("role", "system").put("content", prompt.system());
        messages.addObject().put("role", "user").put("content", prompt.user());
        body.set("format", json.readTree(TagPrompt.SCHEMA));
        body.putObject("options").put("temperature", 0.2).put("num_predict", 100);
        HttpJson.Response res = HttpJson.post(HttpJson.trimSlash(props.baseUrl()) + "/api/chat", Map.of(),
                json.writeValueAsString(body), props.timeout());
        if (res.status() != 200) throw new ModelException(ModelException.Kind.FAILURE);
        JsonNode root;
        try {
            root = json.readTree(res.body());
        } catch (RuntimeException e) {
            throw new ModelException(ModelException.Kind.INVALID);
        }
        JsonNode content = root.path("message").path("content");
        return TagPrompt.parse(content.isString() ? content.asString() : null);
    }
}
