import * as BABYLONMMD from 'babylon-mmd';



export function createMMDMorphController(model: BABYLONMMD.MmdModel) {
  return model.morph;
}

// export type MMDMorphController = ReturnType<typeof createMMDMorphController>;