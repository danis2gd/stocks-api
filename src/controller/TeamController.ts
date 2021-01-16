import { json, Request, Response } from 'express';
import { Controller, Delete, Get, Post, Put, Req, Res, UseBefore } from 'routing-controllers';
import { PlayerService } from '../service/PlayerService';
import { TeamService } from '../service/TeamService';
import { constants as HttpCodes } from 'http2';
import { TeamGetResponse } from '../dto/response/team/TeamGetResponse';
import { TeamDTO } from '../dto/TeamDTO';

@Controller('/team')
@UseBefore(json())
class TeamController {
    private playerService: PlayerService;
    private teamService: TeamService;

    constructor() {
        this.playerService = new PlayerService();
        this.teamService = new TeamService();
    }

    @Get('/')
    async all(@Req() request: Request, @Res() response: Response) {
        return await this.teamService.getAll();
    }

    @Get('/:id')
    async get(@Req() request: Request, @Res() response: Response) {
        const id = parseInt(request.params.id);

        if (id === undefined) {
            return new TeamGetResponse(
                'Couldn\'t find the ID in the request.',
                {},
                HttpCodes.HTTP_STATUS_BAD_REQUEST
            );
        }

        return await this.teamService.get(id);
    }

    @Post('/')
    async create(@Req() request: Request, @Res() response: Response) {
        const data = request.body;

        return await this.teamService.create(
            new TeamDTO(
                data.name,
                data.abbreviation
            )
        );
    }

    @Put('/:id')
    async update(@Req() request: Request, @Res() response: Response) {
        const id = parseInt(request.params.id);
        const data = request.body;

        if (
            data === undefined
            && id === undefined
        ) {
            return response.send({
                message: `No content sent.`,
                data: {},
            });
        }

        return await this.teamService.update(
            id,
            new TeamDTO(
                data.name,
                data.abbreviation
            )
        );
    }

    @Delete('/:id')
    async delete(@Req() request, @Res() response) {
        const id = parseInt(request.params.id);

        return await this.teamService.delete(id);
    }
}

export {
    TeamController
};