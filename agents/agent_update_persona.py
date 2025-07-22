import os

from utils import TensorblockClientRunner, OpenAIClientRunner
from state_persona import PersonaState


class AgentUpdatePersona:
    def __init__(
        self,
        model: str = "OpenAI/gpt-4.1-nano",
        llm_runner_name: str = "Tensorblock",
    ):
        self.model = model
        self.llm_runner_name = llm_runner_name
        self.path_prompts = os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            "..",
            "prompts",
            "update_persona",
        )

        if llm_runner_name == "OpenAI":
            self.llm_runner = OpenAIClientRunner(model=model)
        elif llm_runner_name == "Tensorblock":
            self.llm_runner = TensorblockClientRunner(model=model)
        else:
            raise ValueError(f"Invalid LLM runner name: {llm_runner_name}")

        self.current_persona = {}

    def gen_prompt_update_persona(
        self, conversation: str, current_persona: PersonaState
    ):
        path_prompt = os.path.join(self.path_prompts, "update_persona_instructions.txt")
        assert os.path.exists(path_prompt)
        with open(path_prompt, "r") as f:
            user_instructions_template = f.read()

        path_system = os.path.join(self.path_prompts, "update_persona_system.txt")
        assert os.path.exists(path_system)
        with open(path_system, "r") as f:
            system_prompt = f.read()

        with open("state_persona.py", "r") as f:
            persona_state_str = f.read()
        persona_state_str = persona_state_str[
            persona_state_str.find("class PersonaState") :
        ]
        user_prompt = user_instructions_template.format(PersonaState=persona_state_str)
        user_prompt += f"Input text: {conversation}\n"
        user_prompt += f"Current persona: {current_persona}\n"

        messages = [{"role": "system", "content": system_prompt}]
        messages.append({"role": "user", "content": user_prompt})
        return messages

    def __call__(self, *args, **kwargs):
        messages = self.gen_prompt_update_persona(*args, **kwargs)
        response = self.llm_runner(messages, max_tokens=None)
        return response


if __name__ == "__main__":
    pass
