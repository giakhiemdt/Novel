import {
  generateMapLayers,
  type MapGeneratorWorkerRequest,
  type MapGeneratorWorkerResponse,
} from "./map-generator";

self.onmessage = (event: MessageEvent<MapGeneratorWorkerRequest>) => {
  const { requestId, options } = event.data;
  const layers = generateMapLayers(options);
  const payload: MapGeneratorWorkerResponse = {
    requestId,
    layers,
  };
  self.postMessage(payload);
};

export {};
