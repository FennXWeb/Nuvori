export interface ProductionReview {
 id:string;
 betaSha:string;
 mainSha:string;
 expiresAt:string;
 commitCount:number;
 commits:{sha:string;subject:string}[];
 files:{status:string;path:string}[];
 validation:{passed:boolean;status:string;url:string};
 compareUrl:string;
}
export interface ProductionConfirmation {reviewId:string;betaSha:string;mainSha:string;confirmed:boolean}
export interface ProductionResult {sha:string;commitUrl:string;actionsUrl:string;liveUrl:string}
