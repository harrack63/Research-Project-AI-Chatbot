import os

from utils import TensorblockClientRunner, OpenAIClientRunner
from state_persona import PersonaState


class AgentChat(OpenAIClientRunner):
    def __init__(self, model_name: str = "OpenAI/gpt-4.1-nano"):
        self.path_prompts = os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            "..",
            "prompts",
            "chat",
        )
        super().__init__(model=model_name)

    def gen_prompt_update_persona(
        self,
        persona: PersonaState,
        user_msg: str,
        chat_history: str,
        retrieved_context: str,
    ):
        path_prompt = os.path.join(self.path_prompts, "chat_instructions.txt")
        assert os.path.exists(path_prompt)
        with open(path_prompt, "r") as f:
            user_instructions = f.read()

        path_system = os.path.join(self.path_prompts, "chat_system.txt")
        assert os.path.exists(path_system)
        with open(path_system, "r") as f:
            system_prompt = f.read()

        persona_brief = self.get_focused_persona(persona)

        user_prompt = user_instructions
        user_prompt += f"Full Persona: {persona}\n"
        user_prompt += f"Relevant Persona (focus): {persona_brief}\n"
        user_prompt += f"Previous chat history: {chat_history}\n"
        user_prompt += f"User Query: {user_msg}\n"
        user_prompt += f"Context from retrieval (if any):\n{retrieved_context}"

        messages = [{"role": "system", "content": system_prompt}]
        messages.append({"role": "user", "content": user_prompt})

        return messages

    def get_focused_persona(self, persona: PersonaState):
        # return {
        #     k: v
        #     for k, v in persona.items()
        #     if k in self.persona_brief
        # }
        return persona

    def __call__(self, *args, **kwargs):
        messages = self.gen_prompt_update_persona(*args, **kwargs)
        response = self._call_gpt_retry(messages, max_tokens=None)
        return response


if __name__ == "__main__":
    pass
